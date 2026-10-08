import crypto from "crypto";
import express from "express";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { clampTeamCount, createDefaultTeams, GameName, GameState } from "../shared/types";
import { createRoomGameData, fetchMillionairePool, MillionairePool } from "./datagen";
import { applyPack, listPacks, LoadedPack, loadPack, packBoard, PackSummary } from "./packs";
import { toThemeId } from "../shared/themes";

interface ServerToClientEvents {
  gameCreated: (data: { code: string; adminKey: string; gameState: GameState }) => void;
  gameCreateError: (data: { reason: string }) => void;
  // Names only, for the create-game dropdown; pack questions never leave the server.
  packList: (data: { packs: PackSummary[] }) => void;
  adminTokenResult: (data: { ok: boolean }) => void;
  reconfigureError: (data: { reason: string }) => void;
  gameJoined: (data: { code: string; gameState: GameState }) => void;
  gameNotFound: (data: { code: string }) => void;
  // `code` lets a client double-check a broadcast is actually for the room
  // it currently cares about — belt-and-suspenders alongside the server only
  // ever routing this to sockets joined to that room (see leaveCurrentRoom).
  gameStateUpdate: (data: { code: string; gameState: GameState }) => void;
  adminAuthResult: (data: { isAdmin: boolean }) => void;
  unauthorized: (data: { reason: string }) => void;
}

interface ClientToServerEvents {
  createGame: (data: {
    adminToken?: string;
    teamCount?: number;
    teamNames?: string[];
    packId?: string;
    theme?: string;
  }) => void;
  listPacks: () => void;
  // Lobby only: rebuild the game with a new setup, keeping the room code.
  reconfigureGame: (data: {
    code: string;
    teamCount?: number;
    teamNames?: string[];
    packId?: string;
    theme?: string;
  }) => void;
  // Gate for /sandbox: is this the venue's ADMIN_TOKEN (or is none set)?
  verifyAdminToken: (data: { adminToken?: string }) => void;
  joinGame: (data: { code: string; adminKey?: string; adminToken?: string }) => void;
  gameStateUpdate: (data: { code: string; gameState: GameState }) => void;
  resetGameState: (data: { code: string }) => void;
}

// Per-socket state: which room this connection is in, and whether it holds
// admin rights for that specific room (set once at createGame/joinGame time).
interface SocketData {
  code?: string;
  isAdmin?: boolean;
}

const app = express();
const server = http.createServer(app);

// Shared secret gating room *creation* (and a break-glass override to
// reclaim any room's admin access). Unset by default so local/LAN dev keeps
// working with zero config; set it before exposing the server on the public
// internet, or anyone can create games and burn through the trivia pool.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.warn(
    "ADMIN_TOKEN is not set — anyone can create a game. Fine for local/LAN use, " +
    "but set ADMIN_TOKEN before hosting this on the public internet."
  );
}

const io = new Server<ClientToServerEvents, ServerToClientEvents, {}, SocketData>(server, {
  // Bound incoming payload size — the largest legitimate message is a full
  // GameState, which is well under this; rejects oversized junk outright.
  maxHttpBufferSize: 256 * 1024,
  cors: {
    // Allow requests from the React app. Override with CLIENT_ORIGIN to serve
    // a LAN address instead of localhost.
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

// Loose but cheap shape check on an incoming GameState payload — enough to
// reject garbage/malformed data from a buggy or malicious client before it
// overwrites a room's state and gets broadcast to everyone watching it.
function isPlausibleGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameState>;
  return (
    !!candidate.gameData &&
    typeof candidate.gameData === "object" &&
    Array.isArray(candidate.teams) &&
    candidate.teams.length >= 2 &&
    !!candidate.currentGame &&
    typeof candidate.currentGame === "object"
  );
}

interface Room {
  code: string;
  gameState: GameState;
  // Proves who created this room, so their browser can silently reclaim
  // admin status on reconnect without re-entering ADMIN_TOKEN. Never sent to
  // anyone but the creator.
  adminKey: string;
  lastActivity: number;
  // Custom content pack chosen at creation (file name in src/data/custom);
  // re-read on reset so the pack survives "Play again".
  packId?: string;
}

const requestedPackId = (value: unknown): string | undefined =>
  typeof value === "string" && value ? value : undefined;

// A pack that can be used for a game, or why not (shown to the host).
function usablePack(packId: string | undefined, code: string): { pack: LoadedPack | null; problem?: string } {
  const pack = loadRoomPack(packId, code);
  if (packId && !pack) return { pack, problem: `Content pack "${packId}" wasn't found.` };
  if (pack && pack.columns.length === 0)
    return { pack, problem: `Content pack "${packId}" has no valid columns (run npm run check-pack).` };
  return { pack };
}

// Loads a room's pack, logging entries it had to skip.
function loadRoomPack(packId: string | undefined, code: string): LoadedPack | null {
  if (!packId) return null;
  const pack = loadPack(packId);
  if (pack?.errors.length) {
    console.warn(`Room ${code}: pack "${packId}" skipped ${pack.errors.length} bad entr${pack.errors.length === 1 ? "y" : "ies"}:`);
    pack.errors.forEach((e) => console.warn(`  - ${e}`));
  }
  return pack;
}

const rooms = new Map<string, Room>();

// Avoids visually-ambiguous characters (0/O, 1/I) since this gets read off a
// screen and typed on another device, like a Jackbox room code.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode(): string {
  let code: string;
  do {
    code = Array.from({ length: 4 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function generateAdminKey(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Millionaire trivia is fetched once at boot (see createRoomGameData's doc
// comment) rather than per room. Kick this off immediately so it's usually
// already resolved by the time anyone creates a game; a create request that
// arrives before it resolves just awaits the same in-flight promise.
const millionairePoolPromise: Promise<MillionairePool> = fetchMillionairePool().catch((error) => {
  console.error("Error fetching Millionaire trivia pool:", error);
  return { easy: [], mediumHard: [] };
});

async function buildInitialGameState(
  pool: MillionairePool,
  teamCount: number,
  teamNames?: unknown,
  pack?: LoadedPack | null,
  theme?: unknown
): Promise<GameState> {
  const gameData = await createRoomGameData(pool);
  return {
    started: false,
    theme: toThemeId(theme),
    teams: createDefaultTeams(teamCount, teamNames),
    currentGame: {
      gameName: GameName.BOARD,
      gameTitle: "GameBoard",
      value: 0,
      questionState: { promptVisible: false },
    },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: pack ? applyPack(gameData, pack) : gameData,
    // A pack brings its own one-page board; without one, the Standard board
    // (no `board` in the state) applies.
    ...(pack
      ? {
          board: packBoard(pack),
          boardPage: packBoard(pack)[0].id,
          packId: pack.id,
          titleScreen: pack.titleScreen,
        }
      : {}),
  };
}

// Idle rooms are swept periodically so a long-running server doesn't
// accumulate abandoned games forever.
const ROOM_IDLE_MS = 6 * 60 * 60 * 1000; // 6 hours
const SWEEP_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
setInterval(() => {
  const now = Date.now();
  // .forEach rather than for...of — the latter needs --downlevelIteration
  // under the root tsconfig's es5 target (which also type-checks src/server
  // as part of the CRA app, even though it's compiled separately for real
  // via tsconfig.server.json).
  rooms.forEach((room, code) => {
    if (now - room.lastActivity > ROOM_IDLE_MS) {
      rooms.delete(code);
      console.log(`Swept idle room ${code}`);
    }
  });
}, SWEEP_INTERVAL_MS);

// A socket that switches rooms without a full page reload (e.g. browser
// back button, then joining/creating a different game in the same tab)
// would otherwise stay a member of every room it ever joined — Socket.IO
// rooms are additive, `join` never implicitly leaves a previous one. Left
// unfixed, that socket keeps receiving other rooms' broadcasts indefinitely,
// and a naive client applies whatever gameStateUpdate arrives regardless of
// which room it was for. Call this before joining a new room so a socket is
// only ever in at most one game's room at a time.
function leaveCurrentRoom(socket: Socket<ClientToServerEvents, ServerToClientEvents, {}, SocketData>) {
  if (socket.data.code) {
    socket.leave(socket.data.code);
  }
}

io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);

  // Create a new room. Gated by ADMIN_TOKEN (when set) so creating a game —
  // and burning through the shared Millionaire trivia pool — isn't open to
  // anyone who finds the URL. The creator is automatically that room's admin.
  // Pack names for the create-game dropdown. Unauthenticated like the page
  // itself: it exposes names only, never questions.
  socket.on("listPacks", () => {
    socket.emit("packList", { packs: listPacks() });
  });

  // Lets /sandbox check the token before showing itself. Same rule as
  // createGame: with no ADMIN_TOKEN set, everyone is allowed.
  socket.on("verifyAdminToken", (data) => {
    const ok = !ADMIN_TOKEN || data?.adminToken === ADMIN_TOKEN;
    if (!ok) console.warn(`Rejected sandbox token from ${socket.id}`);
    socket.emit("adminTokenResult", { ok });
  });

  // Change the setup (teams, theme, content pack) before the game starts. The
  // room and its code stay, so a TV already watching just updates; lobby
  // music keeps playing. Rejected once the game has started.
  socket.on("reconfigureGame", async (data) => {
    const code = data?.code;
    const room = code ? rooms.get(code) : undefined;
    if (!room || socket.data.code !== code || !socket.data.isAdmin) {
      console.warn(`Rejected reconfigureGame from unauthorized client: ${socket.id}`);
      socket.emit("unauthorized", { reason: "Invalid or missing admin access for this game." });
      return;
    }
    if (room.gameState.started) {
      socket.emit("reconfigureError", { reason: "The game has already started." });
      return;
    }
    const packId = requestedPackId(data?.packId);
    const { pack, problem } = usablePack(packId, code);
    if (problem) {
      socket.emit("reconfigureError", { reason: problem });
      return;
    }
    const pool = await millionairePoolPromise;
    const { lobbyMusic, lobbyMusicShuffle } = room.gameState;
    room.gameState = {
      ...(await buildInitialGameState(
        pool,
        clampTeamCount(data?.teamCount ?? room.gameState.teams.length),
        data?.teamNames,
        pack,
        data?.theme
      )),
      lobbyMusic,
      lobbyMusicShuffle,
    };
    room.packId = packId;
    room.lastActivity = Date.now();
    io.to(code).emit("gameStateUpdate", { code, gameState: room.gameState });
    console.log(`Room ${code} reconfigured${pack ? ` with pack "${pack.id}"` : ""}.`);
  });

  socket.on("createGame", async (data) => {
    const providedToken = data?.adminToken;
    const isAuthorized = !ADMIN_TOKEN || providedToken === ADMIN_TOKEN;
    if (!isAuthorized) {
      console.warn(`Rejected createGame from unauthenticated client: ${socket.id}`);
      socket.emit("gameCreateError", { reason: "Invalid admin token." });
      return;
    }

    const packId = requestedPackId(data?.packId);
    const code = generateRoomCode();
    const { pack, problem } = usablePack(packId, code);
    if (problem) {
      socket.emit("gameCreateError", { reason: problem });
      return;
    }
    const adminKey = generateAdminKey();
    const pool = await millionairePoolPromise;
    const gameState = await buildInitialGameState(
      pool,
      clampTeamCount(data?.teamCount ?? 2),
      data?.teamNames,
      pack,
      data?.theme
    );
    const room: Room = { code, gameState, adminKey, lastActivity: Date.now(), packId };
    rooms.set(code, room);

    leaveCurrentRoom(socket);
    socket.data.code = code;
    socket.data.isAdmin = true;
    socket.join(code);

    console.log(`Room ${code} created by ${socket.id}${pack ? ` with pack "${pack.id}"` : ""}`);
    socket.emit("gameCreated", { code, adminKey, gameState });
    socket.emit("adminAuthResult", { isAdmin: true });
  });

  // Join an existing room, as a display/spectator by default. Passing the
  // room's adminKey (cached from creation) or the venue's ADMIN_TOKEN
  // (break-glass override) grants admin rights for this room instead.
  socket.on("joinGame", async (data) => {
    const code = data?.code?.toUpperCase();
    const room = code ? rooms.get(code) : undefined;
    if (!room) {
      socket.emit("gameNotFound", { code: code ?? "" });
      return;
    }

    const isAdmin =
      (!!data.adminKey && data.adminKey === room.adminKey) ||
      (!!data.adminToken && !!ADMIN_TOKEN && data.adminToken === ADMIN_TOKEN);

    leaveCurrentRoom(socket);
    socket.data.code = room.code;
    socket.data.isAdmin = isAdmin;
    socket.join(room.code);
    room.lastActivity = Date.now();

    console.log(`${socket.id} joined room ${room.code} (admin: ${isAdmin})`);
    socket.emit("gameJoined", { code: room.code, gameState: room.gameState });
    socket.emit("adminAuthResult", { isAdmin });
  });

  // Handle game state updates from an admin client
  socket.on("gameStateUpdate", (data) => {
    const code = data?.code;
    const room = code ? rooms.get(code) : undefined;
    if (!room || socket.data.code !== code || !socket.data.isAdmin) {
      console.warn(`Rejected gameStateUpdate from unauthorized client: ${socket.id}`);
      socket.emit("unauthorized", { reason: "Invalid or missing admin access for this game." });
      return;
    }
    if (!isPlausibleGameState(data.gameState)) {
      console.warn(`Rejected malformed gameStateUpdate for room ${code}`);
      return;
    }
    room.gameState = data.gameState;
    room.lastActivity = Date.now();
    io.to(code).emit("gameStateUpdate", { code, gameState: room.gameState });
  });

  // Handle reset game state from an admin client
  socket.on("resetGameState", async (data) => {
    const code = data?.code;
    const room = code ? rooms.get(code) : undefined;
    if (!room || socket.data.code !== code || !socket.data.isAdmin) {
      console.warn(`Rejected resetGameState from unauthorized client: ${socket.id}`);
      socket.emit("unauthorized", { reason: "Invalid or missing admin access for this game." });
      return;
    }

    const pool = await millionairePoolPromise;
    // Teams, pack and theme are fixed at creation, so a reset keeps them
    // (scores go back to 0).
    const teams = room.gameState.teams;
    room.gameState = await buildInitialGameState(
      pool,
      teams.length,
      teams.map((team) => team.name),
      loadRoomPack(room.packId, code),
      room.gameState.theme
    );
    room.lastActivity = Date.now();
    io.to(code).emit("gameStateUpdate", { code, gameState: room.gameState });
    console.log(`Room ${code} has been reset.`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Serve the React app (optional, for production)
app.use(express.static("build")); // Serve React app from the 'build' folder

// react-router uses client-side (BrowserRouter) routing, so a direct load or
// refresh of a route like /admin has no matching static file — express.static
// alone 404s on it. Fall back to index.html for any other GET so the client
// router can take over and render the right route. This runs after
// express.static, so real static assets (JS/CSS/images) are still served
// as files and never hit this fallback. __dirname is dist/server (compiled)
// or src/server (ts-node dev) — both two levels below the repo root where
// the CRA build output lives.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "..", "..", "build", "index.html"));
});

// Start the server. Override with PORT to avoid clashing with other apps.
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
