import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import {
  EmptyQuestionState,
  FamilyFeudQuestionState,
  GameName,
  GameState,
  GameName as GameType,
  getGameTitle,
  HeadToHeadQuestionState,
  MillionaireQuestionState,
  MinuteQuestionState,
  Team,
} from "../types/common";
import AdminPageWrapper from "./AdminPageWrapper";
import { useSocket } from "./SocketContext";
import addPointsSound from "../assets/collectpoints.mp3";
import { useLocation } from "react-router-dom";
import SettingsModal from "./SettingsModal";
import { getRandomAudio, happyFiles } from "../types/audio";

interface AdminProps {
  gameState: GameState;
}

const Admin: React.FC<AdminProps> = ({ gameState }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const socket = useSocket();

  // Set up socket listener to update the game state when the server sends updates
  useEffect(() => {
    if (!socket) return; // Ensure socket is connected

    const handleGameStateUpdate = (data: { gameState: GameState }) => {
      setCurrentGameState(data.gameState); // Update the game state with the data from the server
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);

    // Clean up the listener when the component is unmounted
    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [socket]);

  const [currentGameState, setCurrentGameState] =
    useState<GameState>(gameState);

  // Send game state update to Socket.IO server
  const sendGameStateToServer = (updatedGameState: GameState) => {
    if (socket) {
      socket.emit("gameStateUpdate", { gameState: updatedGameState }); // Emit game state to server
    }
  };

  const handleSaveSettings = (gameState: GameState) => {
    setCurrentGameState(gameState);
    sendGameStateToServer(gameState); // Send updated settings to Socket.IO server
  };

  const handleReset = () => {
    const resetState: GameState = {
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
    setCurrentGameState(resetState);
    sendGameStateToServer(resetState); // Send reset state to Socket.IO server
  };

  const handleUpdateCurrentGame = (newGame: GameName, points: number) => {
    console.log("Updating current game");
    const updatedGameState = { ...gameState };

    switch (newGame) {
      case GameName.FAMILY_FEUD: {
        const questionState: FamilyFeudQuestionState = {
          promptVisible: false,
          showFeudPrompt: false,
          revealedAnswers: [],
          wrongGuesses: 0,
        };
        updatedGameState.currentGame = {
          gameName: newGame,
          gameTitle: getGameTitle(newGame),
          value: points,
          questionState: questionState,
        };
        break;
      }
      case GameName.MINUTE: {
        const questionState: MinuteQuestionState = {
          promptVisible: false,
          readyTimer: false,
        };
        updatedGameState.currentGame = {
          gameName: newGame,
          gameTitle: getGameTitle(newGame),
          value: points,
          questionState: questionState,
        };
        break;
      }
      case GameName.HEAD_TO_HEAD: {
        const questionState: HeadToHeadQuestionState = {
          promptVisible: false,
          showTitle: false,
        };
        updatedGameState.currentGame = {
          gameName: newGame,
          gameTitle: getGameTitle(newGame),
          value: points,
          questionState: questionState,
        };
        break;
      }
      case GameName.MILLIONAIRE: {
        const questionState: MillionaireQuestionState = {
          promptVisible: false,
          questionIdx: 0,
          revealedAnswers: 0,
        };
        updatedGameState.currentGame = {
          gameName: newGame,
          gameTitle: getGameTitle(newGame),
          value: points,
          questionState: questionState,
        };
        break;
      }
      case GameName.SINGING: {
        const questionState: EmptyQuestionState = {
          promptVisible: false,
        };
        updatedGameState.currentGame = {
          gameName: newGame,
          gameTitle: getGameTitle(newGame),
          value: points,
          questionState: questionState,
        };
        break;
      }
      default:
        updatedGameState.currentGame = {
          gameName: newGame,
          gameTitle: getGameTitle(newGame),
          value: points,
          questionState: { promptVisible: false },
        };
        break;
    }

    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState); // Send update to Socket.IO server
  };

  const handleUpdateTurn = (team: Team) => {
    if (!currentGameState || !socket) return;

    const updatedGameState = { ...currentGameState };
    updatedGameState.whoseTurn = team;

    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState);
  };

  const handleAddPoints = (
    team: Team,
    points: number,
    gameName: GameName,
    noPointsOverride: boolean
  ) => {
    if (!currentGameState || !socket) return;
    const updatedGameState = { ...currentGameState };

    if (!noPointsOverride) {
      updatedGameState[team].score += points;
      const audio = new Audio(getRandomAudio(happyFiles));
      audio.play();
    }

    const answered = updatedGameState.isDoubleJeopardy
      ? updatedGameState.doubleJeopardyAnswered
      : updatedGameState.answered;

    if (!answered[gameName]) {
      answered[gameName] = [];
    }
    answered[gameName].push(points);

    if (gameState.isDoubleJeopardy) {
      updatedGameState.doubleJeopardyAnswered = answered;
    } else {
      updatedGameState.answered = answered;
    }

    updatedGameState.whoseTurn = team;
    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState);
  };

  const handleBackButton = () => {
    if (!currentGameState || !socket) return;

    const updatedGameState = { ...currentGameState };
    updatedGameState.currentGame = {
      gameName: GameType.BOARD,
      gameTitle: "GameBoard",
      value: 0,
      questionState: {
        promptVisible: false,
      },
    };

    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState);
  };

  const handleRevealQuestion = () => {
    if (!currentGameState || !socket) return;
    const updatedGameState = { ...currentGameState };
    updatedGameState.currentGame.questionState.promptVisible = true;

    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState);
  };

  const location = useLocation(); // Get the current location

  return (
    <div className="admin-container">
      {/* Conditionally show the settings button only on the home page */}
      {location.pathname === "/admin" && (
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

      <AdminPageWrapper
        gameState={gameState}
        handleUpdateCurrentGame={handleUpdateCurrentGame}
        handleAddPoints={handleAddPoints}
        handleRevealQuestion={handleRevealQuestion}
        handleBackButon={handleBackButton}
        sendGameStateToServer={sendGameStateToServer}
        handleUpdateTurn={handleUpdateTurn}
      ></AdminPageWrapper>
    </div>
  );
};

export default Admin;
