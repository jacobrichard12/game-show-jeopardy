import express from "express";
import http from "http";
import { Server } from "socket.io";
import { GameName, GameState, Team } from "../shared/types";
import { initGameData } from "./datagen";

interface ServerToClientEvents {
  initialGameState: (data: { gameState: GameState }) => void;
  gameStateUpdate: (data: { gameState: GameState }) => void;
}

interface ClientToServerEvents {
  gameStateUpdate: (data: { gameState: GameState }) => void;
  resetGameState: () => void;
}

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: "http://localhost:3000", // Allow requests from the React app
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true,
  },
});

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

  // Send the initial game state to the client if it is ready
  if (gameState) {
    socket.emit("initialGameState", { gameState });
  } else {
    console.log(`Game state not initialized. Adding client to waitlist: ${socket.id}`);
    waitingClients.add(socket.id);
  }

  // Handle game state updates from client
  socket.on("gameStateUpdate", (data) => {
    console.log("Received gameStateUpdate from client:", data);
    gameState = data.gameState; // Update server-side state
    io.emit("gameStateUpdate", { gameState }); // Broadcast the updated state to all clients
  });

  // Handle reset game state from client
  socket.on("resetGameState", async () => {
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

// Start the server on port 4000
server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
