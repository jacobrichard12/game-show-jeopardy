import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { GameState, Team } from "../App";
import { GameName, GameName as GameType } from "../types/common";
import AdminPageWrapper from "./AdminPageWrapper";

interface AdminProps {
  gameState: GameState;
}

const Admin: React.FC<AdminProps> = ({ gameState }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentGameState, setCurrentGameState] =
    useState<GameState>(gameState);

  // Establish Socket.IO connection
  useEffect(() => {
    const socketIo = io("http://localhost:4000");
    socketIo.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });
    socketIo.on("gameStateUpdate", (data: { gameState: GameState }) => {
      setCurrentGameState(data.gameState); // Update the game state when the server sends an update
    });
    socketIo.on("disconnect", () => {
      console.log("Disconnected from Socket.IO server");
    });
    setSocket(socketIo);
    // Clean up on component unmount
    return () => {
      if (socketIo) {
        socketIo.disconnect();
      }
    };
  }, []);

  // Send game state update to Socket.IO server
  const sendGameStateToServer = (updatedGameState: GameState) => {
    if (socket) {
      socket.emit("gameStateUpdate", { gameState: updatedGameState }); // Emit game state to server
    }
  };

  const handleAddPoints = (team: Team, points: number, gameName: GameName) => {
    if (!currentGameState || !socket) return;

    const updatedGameState = { ...currentGameState };
    updatedGameState[team].score += points;
    if (!updatedGameState.answered[gameName]) {
      updatedGameState.answered[gameName] = [];
    }
    updatedGameState.answered[gameName].push(points);

    // Update local state
    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState);
  };

  const handleRevealQuestion = () => {
    if (!currentGameState || !socket) return;
    const updatedGameState = { ...currentGameState };
    updatedGameState.currentGame.questionVisibile = true;
    // Update local state
    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState);
  };

  return (
    <div className="admin-container">
      <AdminPageWrapper
        gameState={gameState}
        handleAddPoints={handleAddPoints}
        handleRevealQuestion={handleRevealQuestion}
      ></AdminPageWrapper>
    </div>
  );
};

export default Admin;
