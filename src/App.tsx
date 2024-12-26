import React, { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Admin from "./components/Admin";
import PageWrapper from "./components/PageWrapper";
import { SocketProvider, useSocket } from "./components/SocketContext";
import TitlePage from "./components/TitlePage";
import gameBoardData from "./data/gameBoard.json";
import { GameState } from "./shared/types";

const App: React.FC = () => {
  const socket = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  // Wait for the server to send the initial game state
  useEffect(() => {
    if (!socket) return;

    const handleInitialGameState = (data: { gameState: GameState }) => {
      setGameState(data.gameState);
      setLoading(false);
    };

    // Listen for the game state update from the server
    socket.on("initialGameState", handleInitialGameState);

    return () => {
      socket.off("initialGameState", handleInitialGameState);
    };
  }, [socket]);

  // Set up socket listener for subsequent game state updates
  useEffect(() => {
    if (!socket) return;

    const handleGameStateUpdate = (data: { gameState: GameState }) => {
      setGameState(data.gameState);
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [socket]);

  // Render loading or main app based on game state
  if (loading) return <div>Loading game state...</div>;
  if (!gameState) return <div>Game state unavailable. Please try again.</div>;

  return (
    <div className="App">
      <Routes>
        <Route
          path="/"
          element={
            !gameState.started ? (
              <TitlePage
                isAdmin={false}
                gameState={gameState}
                sendGameStateToServer={() => {}}
              />
            ) : (
              <PageWrapper
                gameState={gameState}
                gameBoardData={gameBoardData}
              />
            )
          }
        />
        <Route path="/admin" element={<Admin gameState={gameState} />} />
      </Routes>
    </div>
  );
};

export const AppWithProviders: React.FC = () => (
  <SocketProvider>
    <App />
  </SocketProvider>
);

export default AppWithProviders;
