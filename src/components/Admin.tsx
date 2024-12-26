import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getRandomAudio, happyFiles } from "../shared/audio";
import {
  FamilyFeudQuestionState,
  GameName,
  GameState,
  GameName as GameType,
  getGameTitle,
  HeadToHeadQuestionState,
  MillionaireQuestionState,
  MinuteQuestionState,
  Team,
} from "../shared/types";
import AdminPageWrapper from "./AdminPageWrapper";
import SettingsModal from "./SettingsModal";
import { useSocket } from "./SocketContext";

interface AdminProps {
  gameState: GameState;
}

const Admin: React.FC<AdminProps> = ({ gameState }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleGameStateUpdate = (data: { gameState: GameState }) => {
      setCurrentGameState(data.gameState);
    };

    socket.on("gameStateUpdate", handleGameStateUpdate);

    return () => {
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [socket]);

  const [currentGameState, setCurrentGameState] =
    useState<GameState>(gameState);

  const sendGameStateToServer = (updatedGameState: GameState) => {
    if (socket) {
      socket.emit("gameStateUpdate", { gameState: updatedGameState });
    }
  };

  const handleSaveSettings = (gameState: GameState) => {
    setCurrentGameState(gameState);
    sendGameStateToServer(gameState);
  };

  const handleReset = async () => {
    if (socket) {
      socket.emit("resetGameState");
    }
  };

  const handleToggleTimer = () => {
    const updatedGameState = { ...gameState };
    if (!updatedGameState.showTimer) {
      updatedGameState.showTimer = true;
    } else {
      updatedGameState.showTimer = false;
    }
    setCurrentGameState(updatedGameState);
    sendGameStateToServer(updatedGameState);
  };

  const handleUpdateCurrentGame = (newGame: GameName, points: number) => {
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
    sendGameStateToServer(updatedGameState);
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

  const location = useLocation();

  return (
    <div className="admin-container">
      {location.pathname === "/admin" && (
        <div className="fixed top-4 right-4">
          {/* Wrap buttons in a span for alignment */}
          <span className="flex space-x-2">
            <button
              onClick={handleToggleTimer}
              className="p-2 bg-green-500 text-white rounded"
            >
              Toggle Timer
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 bg-blue-500 text-white rounded"
            >
              Settings
            </button>
          </span>
        </div>
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
      />
    </div>
  );
};

export default Admin;
