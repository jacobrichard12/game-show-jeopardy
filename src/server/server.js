// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",  // Allow requests from the React app
    methods: ["GET", "POST"],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("New client connected");

  // Handle events from client
  socket.on("gameStateUpdate", (data) => {
    console.log("Received gameStateUpdate:", data);
    // Broadcast to all clients
    io.emit("gameStateUpdate", data);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Serve the React app (optional)
app.use(express.static("build")); // Serve React app from 'build' folder

// Start the server on port 4000
server.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});
