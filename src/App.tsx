import React, { useState, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import io from "socket.io-client"; // Import socket.io-client
import GameBoard from "./components/GameBoard";
import gameBoard from "./data/gameBoard.json";
import PageWrapper from "./components/PageWrapper";
import SettingsModal from "./components/SettingsModal";
import Admin from "./components/Admin"; // Import the Admin component
import { GameName } from "./types/common";

export enum Team {
  TeamA = "TeamA",
  TeamB = "TeamB",
}

export interface GameState {
  [Team.TeamA]: {
    name: string;
    score: number;
  };
  [Team.TeamB]: {
    name: string;
    score: number;
  };
  currentGame: CurrentGame;
  answered: { [key: string]: number[] };
}

export interface CurrentGame {
  gameName: GameName;
  value: number;
  questionVisibile: boolean;
}

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    [Team.TeamA]: { name: "Team A", score: 0 },
    [Team.TeamB]: { name: "Team B", score: 0 },
    currentGame: {
      gameName: GameName.BOARD,
      value: 0,
      questionVisibile: false,
    },
    answered: {},
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [socket, setSocket] = useState<any>(null); // Socket connection state

  // Set up the Socket.IO connection
  useEffect(() => {
    const socketInstance = io("http://localhost:4000"); // Connect to Socket.IO server

    socketInstance.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socketInstance.on("gameStateUpdate", (data: { gameState: GameState }) => {
      setGameState(data.gameState); // Update the game state when the server sends an update
    });
    setSocket(socketInstance); // Save socket instance

    // Clean up the Socket.IO connection when the component is unmounted
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Send game state update to Socket.IO server
  const sendGameStateToServer = (updatedGameState: GameState) => {
    if (socket) {
      socket.emit("gameStateUpdate", { gameState: updatedGameState }); // Emit game state to server
    }
  };

  const handleUpdateCurrentGame = (newGame: GameName, points: number) => {
    const updatedGameState = { ...gameState };
    updatedGameState.currentGame = {
      gameName: newGame,
      value: points,
      questionVisibile: false,
    }
    setGameState(updatedGameState);
    sendGameStateToServer(updatedGameState); // Send update to Socket.IO server
  };

  const handleAddPoints = (team: Team, points: number) => {
    const updatedGameState = { ...gameState };
    updatedGameState[team].score += points;
    setGameState(updatedGameState);
    sendGameStateToServer(updatedGameState); // Send update to Socket.IO server
  };

  const handleSaveSettings = (gameState: GameState) => {
    setGameState(gameState);
    sendGameStateToServer(gameState); // Send updated settings to Socket.IO server
  };

  const handleQuestionComplete = (
    category: string,
    value: number,
    gameState: GameState
  ) => {
    const updatedGameState = { ...gameState };
    if (!updatedGameState.answered[category]) {
      updatedGameState.answered[category] = [];
    }
    updatedGameState.answered[category].push(value);
    setGameState(updatedGameState);
    sendGameStateToServer(updatedGameState); // Send update to Socket.IO server
  };

  const handleReset = () => {
    const resetState = {
      [Team.TeamA]: { name: "Team A", score: 0 },
      [Team.TeamB]: { name: "Team B", score: 0 },
      answered: {},
      currentGame: {
        gameName: GameName.BOARD,
        value: 0,
        questionVisibile: false,
      },
    };
    setGameState(resetState);
    sendGameStateToServer(resetState); // Send reset state to Socket.IO server
  };

  const location = useLocation(); // Get the current location

  return (
    <div className="App">
      <h1 className="text-center text-4xl font-bold py-4">Game Show App</h1>

      {/* Conditionally show the settings button only on the home page */}
      {location.pathname === "/" && (
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="fixed top-4 right-4 p-2 bg-blue-500 text-white rounded"
        >
          Settings
        </button>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onReset={handleReset}
        gameState={gameState}
      />

      <Routes>
        <Route
          path="/"
          element={
            <GameBoard
              gameState={gameState}
              gameBoardData={gameBoard}
              handleUpdateCurrentGame={handleUpdateCurrentGame}
            />
          }
        />
        <Route
          path="/:categoryRoute/:value"
          element={
            <PageWrapper
              gameState={gameState}
              gameBoardData={gameBoard}
              handleAddPoints={handleAddPoints}
              handleQuestionComplete={handleQuestionComplete}
              handleUpdateCurrentGame={handleUpdateCurrentGame}
            />
          }
        />
        <Route path="/admin" element={<Admin gameState={gameState} />} />
      </Routes>
    </div>
  );
};

export default App;
