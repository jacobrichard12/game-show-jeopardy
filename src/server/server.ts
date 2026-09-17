import express from "express";
import http from "http";
import { Server } from "socket.io";
import { GameName, GameState, Team } from "../shared/types";
import { initGameData } from "./datagen";

interface ServerToClientEvents {
  initialGameState: (data: { gameState: GameState }) => void;
  gameStateUpdate: (data: { gameState: GameState }) => void;
  unauthorized: (data: { reason: string }) => void;
  adminAuthResult: (data: { isAdmin: boolean }) => void;
}

interface ClientToServerEvents {
  gameStateUpdate: (data: { gameState: GameState }) => void;
  resetGameState: () => void;
}

const app = express();
const server = http.createServer(app);

// Shared secret gating admin actions (gameStateUpdate / resetGameState). Unset
// by default so local/LAN dev keeps working with zero config; set it before
// exposing the server on the public internet, or anyone who finds the URL can
// control the game. The admin client sends it via the socket auth handshake.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.warn(
    "ADMIN_TOKEN is not set — admin actions are unauthenticated. Fine for local/LAN use, " +
    "but set ADMIN_TOKEN before hosting this on the public internet."
  );
}

// Configure CORS for Socket.IO
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
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
// overwrites the shared state and gets broadcast to every connected screen.
function isPlausibleGameState(value: unknown): value is GameState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<GameState>;
  return (
    !!candidate.gameData &&
    typeof candidate.gameData === "object" &&
    !!candidate[Team.TeamA] &&
    !!candidate[Team.TeamB] &&
    !!candidate.currentGame &&
    typeof candidate.currentGame === "object"
  );
}

// Placeholder for game state
let gameState: GameState | null = null;

// Queue to hold sockets that connected before the game state was initialized
const waitingClients: Set<string> = new Set();

// Function to initialize game data
const loadGameData = async () => {
  try {
    // Construct initial GameState using fetched data
    gameState = {
      started: false,
      TeamA: { name: "Team A", score: 0 },
      TeamB: { name: "Team B", score: 0 },
      currentGame: {
        gameName: GameName.BOARD,
        gameTitle: "GameBoard",
        value: 0,
        questionState: { promptVisible: false },
      },
      isDoubleJeopardy: false,
      answered: {},
      doubleJeopardyAnswered: {},
      gameData: await initGameData(),
    };

    console.log("GameState initialized:", gameState);
    console.log("Game is ready");

    // Notify all waiting clients
    waitingClients.forEach((socketId) => {
      const socket = io.sockets.sockets.get(socketId);
      if (socket && gameState != null) {
        socket.emit("initialGameState", { gameState });
      }
    });
    waitingClients.clear(); // Clear the waiting list after notifying clients
  } catch (error) {
    console.error("Error initializing game state:", error);
  }
};

// Load the initial game state on server startup
loadGameData();

// WebSocket connection handling
io.on("connection", (socket) => {
  console.log(`New client connected: ${socket.id}`);
  console.log("GameState:");
  console.log(gameState);

  // Evaluated once at connect time from the handshake; a client that gets a
  // token later (e.g. entering it in the admin UI) reconnects to re-run this.
  const isAdminSocket = !ADMIN_TOKEN || socket.handshake.auth?.token === ADMIN_TOKEN;

  // Tell the client its admin status right away — the admin UI waits for
  // this before showing the panel, instead of optimistically letting anyone
  // in and only finding out a token was wrong once an action gets rejected.
  socket.emit("adminAuthResult", { isAdmin: isAdminSocket });

  // Send the initial game state to the client if it is ready
  if (gameState) {
    socket.emit("initialGameState", { gameState });
  } else {
    console.log(`Game state not initialized. Adding client to waitlist: ${socket.id}`);
    waitingClients.add(socket.id);
  }

  // Handle game state updates from client
  socket.on("gameStateUpdate", (data) => {
    if (!isAdminSocket) {
      console.warn(`Rejected gameStateUpdate from unauthenticated client: ${socket.id}`);
      socket.emit("unauthorized", { reason: "Invalid or missing admin token." });
      return;
    }
    if (!isPlausibleGameState(data?.gameState)) {
      console.warn(`Rejected malformed gameStateUpdate from ${socket.id}`);
      return;
    }
    console.log("Received gameStateUpdate from client:", data);
    gameState = data.gameState; // Update server-side state
    io.emit("gameStateUpdate", { gameState }); // Broadcast the updated state to all clients
  });

  // Handle reset game state from client
  socket.on("resetGameState", async () => {
    if (!isAdminSocket) {
      console.warn(`Rejected resetGameState from unauthenticated client: ${socket.id}`);
      socket.emit("unauthorized", { reason: "Invalid or missing admin token." });
      return;
    }
    console.log("Resetting game state from client");

    // Initialize the game data and reset state
    const resetState: GameState = {
      gameData: await initGameData(),
      [Team.TeamA]: { name: "Team A", score: 0 },
      [Team.TeamB]: { name: "Team B", score: 0 },
      answered: {},
      doubleJeopardyAnswered: {},
      currentGame: {
        gameName: GameName.BOARD,
        gameTitle: "GameBoard",
        value: 0,
        questionState: {
          promptVisible: false,
        },
      },
      isDoubleJeopardy: false,
    };

    // Update the server-side game state
    gameState = resetState;

    // Emit the updated game state to all connected clients
    io.emit("gameStateUpdate", { gameState });

    console.log("Game state has been reset and broadcasted to clients.");
  });

  // Handle client disconnect
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    waitingClients.delete(socket.id); // Remove from waiting list if they disconnect
  });

});

// Serve the React app (optional, for production)
app.use(express.static("build")); // Serve React app from the 'build' folder

// Start the server. Override with PORT to avoid clashing with other apps.
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
