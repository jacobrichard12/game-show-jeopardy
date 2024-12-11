import React, { useState, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import io from "socket.io-client"; // Import socket.io-client
import gameBoardData from "./data/gameBoard.json";
import PageWrapper from "./components/PageWrapper";
import SettingsModal from "./components/SettingsModal";
import Admin from "./components/Admin"; // Import the Admin component
import { GameName, GameState, Team } from "./types/common";
import { SocketProvider, useSocket } from "./components/SocketContext";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    [Team.TeamA]: { name: "Team A", score: 0 },
    [Team.TeamB]: { name: "Team B", score: 0 },
    currentGame: {
      gameName: GameName.BOARD,
      gameTitle: "GameBoard",
      value: 0,
      questionState: {
        promptVisible: false,
      },
    },
    answered: {},
    isDoubleJeopardy: false,
  });
  const socket = useSocket();

  // Set up socket listener to update the game state when the server sends updates
  useEffect(() => {
    if (!socket) return; // Ensure socket is connected

    const handleGameStateUpdate = (data: { gameState: GameState }) => {
      setGameState(data.gameState); // Update the game state with the data from the server
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);

    // Clean up the listener when the component is unmounted
    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [socket]);

  return (
    <div className="App">
      <h1 className="text-center text-4xl font-bold py-4">Game Show Jeopardy </h1>
      <Routes>
        <Route
          path="/"
          element={
            <PageWrapper gameState={gameState} gameBoardData={gameBoardData} />
          }
        />
        <Route path="/admin" element={<Admin gameState={gameState} />} />
      </Routes>
    </div>
  );
};

export default App;

// Wrap the entire app with the SocketProvider
export const AppWithSocketProvider: React.FC = () => {
  return (
    <SocketProvider>
      <App />
    </SocketProvider>
  );
};
