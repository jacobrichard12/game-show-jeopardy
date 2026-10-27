import crypto from "crypto";
import express from "express";
import http from "http";
import path from "path";
import { Server, Socket } from "socket.io";
import { clampTeamCount, createDefaultTeams, GameData, GameName, GameState, SandboxPack } from "../shared/types";
import { createRoomGameData, fetchMillionairePool, MillionairePool } from "./datagen";
import { shouldSweepRoom, SWEEP_INTERVAL_MS } from "./roomSweep";
import { applyPack, listPacks, LoadedPack, loadPack, packBoard, PackSummary } from "./packs";
import { toThemeId } from "../shared/themes";
import { Access, accessFor, GUEST_MAX_ROOMS, parseGuestTokens } from "./access";

interface ServerToClientEvents {
  gameCreated: (data: { code: string; adminKey: string; gameState: GameState }) => void;
  gameCreateError: (data: { reason: string }) => void;
  // Names only, for the create-game dropdown; pack questions never leave the server.
  packList: (data: { packs: PackSummary[] }) => void;
  // `guest`: a guest pass (built-in questions only, no content packs).
  adminTokenResult: (data: { ok: boolean; guest?: boolean }) => void;
  sandboxPackResult: (data: { ok: boolean; reason?: string; pack?: SandboxPack }) => void;
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
  // Pack names, for an admin: the admin token, or this socket hosting a
  // game an admin created. Guests and visitors get an empty list.
  listPacks: (data?: { adminToken?: string }) => void;
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
  // /sandbox: a content pack's questions and layout, to test it (same gate).
  sandboxPack: (data: { adminToken?: string; packId?: string }) => void;
  joinGame: (data: { code: string; adminKey?: string; adminToken?: string }) => void;
  gameStateUpdate: (data: { code: string; gameState: GameState }) => void;
  resetGameState: (data: { code: string }) => void;
}

// Per-socket state: which room this connection is in, and whether it holds
// admin rights for that specific room (set once at createGame/joinGame time).
interface SocketData {
  code?: string;
  isAdmin?: boolean;
  // Hosting a game created with the admin token: may use content packs.
  packAccess?: boolean;
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

// Guest passes (access.ts): host with the built-in questions only.
const guestTokens = parseGuestTokens(process.env.GUEST_TOKENS);
guestTokens.errors.forEach((e) => console.warn(`GUEST_TOKENS: ${e}; skipped.`));
if (guestTokens.passes.length) console.log(`${guestTokens.passes.length} guest pass(es) configured.`);
const access = (token: unknown): Access | null => accessFor(token, ADMIN_TOKEN, guestTokens.passes, Date.now());

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
  // Created with a guest pass: that pass may reclaim it, and it can't use
  // content packs.
  guestToken?: string;
}

const GUEST_NO_PACKS = "Guest host tokens use the built-in questions; content packs need the admin token.";

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
          ...(pack.doubleJeopardy ? {} : { noDoubleJeopardy: true }),
          ...(pack.hideJoinCode ? { hideJoinCode: true } : {}),
        }
      : {}),
  };
}

// Idle rooms are swept periodically so a long-running server doesn't
// accumulate abandoned games forever (rules in roomSweep.ts: never while a
// screen is connected; otherwise after 24 idle hours).
setInterval(() => {
  const now = Date.now();
  // .forEach rather than for...of — the latter needs --downlevelIteration
  // under the root tsconfig's es5 target (which also type-checks src/server
  // as part of the CRA app, even though it's compiled separately for real
  // via tsconfig.server.json).
  rooms.forEach((room, code) => {
    const connected = io.sockets.adapter.rooms.get(code)?.size ?? 0;
    if (shouldSweepRoom(room.lastActivity, now, connected)) {
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
  socket.on("listPacks", (data) => {
    const allowed = access(data?.adminToken) === "admin" || !!socket.data.packAccess;
    socket.emit("packList", { packs: allowed ? listPacks() : [] });
  });

  // Lets /sandbox check the token before showing itself. Same rule as
  // createGame: with no ADMIN_TOKEN set, everyone is allowed.
  // Guest passes get in too, with the sample questions only (no packs).
  socket.on("verifyAdminToken", (data) => {
    const level = access(data?.adminToken);
    if (!level) console.warn(`Rejected sandbox token from ${socket.id}`);
    socket.emit("adminTokenResult", { ok: !!level, ...(level === "guest" ? { guest: true } : {}) });
  });

  // The sandbox tries out a content pack: just the pack's own questions (no
  // normal banks; the sandbox keeps its sample questions for the rest) and
  // its layout. Questions only leave the server behind the admin token.
  socket.on("sandboxPack", (data) => {
    const ok = access(data?.adminToken) === "admin";
    if (!ok) {
      console.warn(`Rejected sandboxPack from ${socket.id}`);
      socket.emit("sandboxPackResult", { ok: false, reason: "Content packs need the admin token." });
      return;
    }
    const pack = typeof data?.packId === "string" ? loadPack(data.packId) : null;
    if (!pack || pack.columns.length === 0) {
      socket.emit("sandboxPackResult", { ok: false, reason: `Content pack "${data?.packId}" not found or has no valid columns.` });
      return;
    }
    socket.emit("sandboxPackResult", {
      ok: true,
      pack: {
        id: pack.id,
        name: pack.name,
        gameData: applyPack({} as GameData, pack),
        board: packBoard(pack),
        titleScreen: pack.titleScreen,
        hideJoinCode: pack.hideJoinCode,
        noDoubleJeopardy: !pack.doubleJeopardy,
      },
    });
  });

  // Change the setup (teams, theme, content pack) before the game starts. The
  // room and its code stay, so a TV already watching just updates; lobby
  // music keeps playing. Rejected once the game has started.
  socket.on("reconfigureGame", async (data) => {
    const code = data?.code;
    const room = code ? rooms.get(code) : undefined;
    if (!room || socket.data.code !== code || !socket.data.isAdmin) {
      console.warn(`Rejected reconfigureGame from unauthorized client: ${socket.id}`);
      socket.emit("unauthorized", { reason: "Invalid or missing host access for this game." });
      return;
    }
    if (room.gameState.started) {
      socket.emit("reconfigureError", { reason: "The game has already started." });
      return;
    }
    const packId = requestedPackId(data?.packId);
    if (packId && room.guestToken) {
      socket.emit("reconfigureError", { reason: GUEST_NO_PACKS });
      return;
    }
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
    const level = access(providedToken);
    if (!level) {
      console.warn(`Rejected createGame from unauthenticated client: ${socket.id}`);
      socket.emit("gameCreateError", { reason: "Invalid host token." });
      return;
    }

    const packId = requestedPackId(data?.packId);
    const guestToken = level === "guest" ? (providedToken as string) : undefined;
    if (guestToken) {
      if (packId) {
        socket.emit("gameCreateError", { reason: GUEST_NO_PACKS });
        return;
      }
      let open = 0;
      rooms.forEach((r) => {
        if (r.guestToken === guestToken) open++;
      });
      if (open >= GUEST_MAX_ROOMS) {
        socket.emit("gameCreateError", {
          reason: `This guest pass already has ${GUEST_MAX_ROOMS} games open. Use one of them; idle games close after a day.`,
        });
        return;
      }
    }
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
    const room: Room = { code, gameState, adminKey, lastActivity: Date.now(), packId, guestToken };
    rooms.set(code, room);

    leaveCurrentRoom(socket);
    socket.data.code = code;
    socket.data.isAdmin = true;
    socket.data.packAccess = !guestToken;
    socket.join(code);

    console.log(`Room ${code} created by ${socket.id}${pack ? ` with pack "${pack.id}"` : ""}${guestToken ? " (guest pass)" : ""}`);
    socket.emit("gameCreated", { code, adminKey, gameState });
    socket.emit("adminAuthResult", { isAdmin: true });
  });

  // Join an existing room, as a display/spectator by default. Passing the
  // room's adminKey (cached from creation) or the venue's ADMIN_TOKEN
  // (break-glass override) grants admin rights for this room instead; a
  // guest pass does so only for the games it created.
  socket.on("joinGame", async (data) => {
    const code = data?.code?.toUpperCase();
    const room = code ? rooms.get(code) : undefined;
    if (!room) {
      socket.emit("gameNotFound", { code: code ?? "" });
      return;
    }

    const level = data.adminToken ? access(data.adminToken) : null;
    const isAdmin =
      (!!data.adminKey && data.adminKey === room.adminKey) ||
      (!!ADMIN_TOKEN && level === "admin") ||
      (level === "guest" && room.guestToken === data.adminToken);

    leaveCurrentRoom(socket);
    socket.data.code = room.code;
    socket.data.isAdmin = isAdmin;
    socket.data.packAccess = isAdmin && !room.guestToken;
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
      socket.emit("unauthorized", { reason: "Invalid or missing host access for this game." });
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
      socket.emit("unauthorized", { reason: "Invalid or missing host access for this game." });
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
// refresh of a route like /host has no matching static file — express.static
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
