import React, { useState } from "react";
import { getRandomAudio, happyFiles } from "../shared/audio";
import {
  FamilyFeudQuestionState,
  GameName,
  GameState,
  getGameTitle,
  HeadToHeadQuestionState,
  MillionaireQuestionState,
  MinuteQuestionState,
  Team,
} from "../shared/types";
import AdminPageWrapper from "./AdminPageWrapper";
import SettingsModal from "./SettingsModal";
import {
  useAdminAuthStatus,
  useSetAdminToken,
  useSocket,
} from "./SocketContext";

interface AdminProps {
  gameState: GameState;
}

// Admin has no local copy of GameState — it reads the same `gameState` prop
// that App.tsx keeps in sync from the server's `gameStateUpdate` broadcast.
// A second copy here (updated via its own socket listener) previously drifted
// out of sync with the prop whenever a broadcast landed between actions,
// silently reverting whichever action read the stale copy.
const Admin: React.FC<AdminProps> = ({ gameState }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const socket = useSocket();
  const setAdminToken = useSetAdminToken();

  // Gate the panel behind an admin token. The panel only renders once the
  // server has actually confirmed this socket's token via `adminAuthResult`
  // — submitting the form does not by itself grant access, since we can't
  // know a token is correct until the server checks it against ADMIN_TOKEN.
  // Subscribed in SocketContext (not here) — see useAdminAuthStatus's doc
  // comment for why it can't be subscribed from this component.
  const authStatus = useAdminAuthStatus();
  const [tokenInput, setTokenInput] = useState("");
  // Only show "that token was rejected" once they've actually tried one —
  // a fresh visit that resolves to "denied" (no token cached yet) isn't a
  // wrong password, it's just nobody's entered one for this browser yet.
  const [hasAttempted, setHasAttempted] = useState(false);

  const handleSubmitToken = () => {
    setHasAttempted(true);
    setAdminToken(tokenInput); // reconnects the socket; adminAuthResult follows
  };

  const sendGameStateToServer = (updatedGameState: GameState) => {
    if (socket) {
      socket.emit("gameStateUpdate", { gameState: updatedGameState });
    }
  };

  const handleSaveSettings = (updatedGameState: GameState) => {
    sendGameStateToServer(updatedGameState);
  };

  const handleReset = async () => {
    if (socket) {
      socket.emit("resetGameState");
    }
  };

  const handleToggleTimer = () => {
    const updatedGameState = { ...gameState };
    updatedGameState.showTimer = !updatedGameState.showTimer;
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

    sendGameStateToServer(updatedGameState);
  };

  const handleUpdateTurn = (team: Team) => {
    if (!socket) return;

    const updatedGameState = { ...gameState };
    updatedGameState.whoseTurn = team;

    sendGameStateToServer(updatedGameState);
  };

  const handleAddPoints = (
    team: Team,
    points: number,
    gameName: GameName,
    noPointsOverride: boolean
  ) => {
    if (!socket) return;
    const updatedGameState = { ...gameState };

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

    if (updatedGameState.isDoubleJeopardy) {
      updatedGameState.doubleJeopardyAnswered = answered;
    } else {
      updatedGameState.answered = answered;
    }

    updatedGameState.whoseTurn = team;
    sendGameStateToServer(updatedGameState);
  };

  const handleBackButton = () => {
    if (!socket) return;

    const updatedGameState = { ...gameState };
    updatedGameState.currentGame = {
      gameName: GameName.BOARD,
      gameTitle: "GameBoard",
      value: 0,
      questionState: {
        promptVisible: false,
      },
    };

    sendGameStateToServer(updatedGameState);
  };

  const handleRevealQuestion = () => {
    if (!socket) return;
    const updatedGameState = { ...gameState };
    updatedGameState.currentGame.questionState.promptVisible = true;

    sendGameStateToServer(updatedGameState);
  };

  if (authStatus === "pending") {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 italic">
        Checking admin access...
      </div>
    );
  }

  if (authStatus === "denied") {
    return (
      <div className="flex items-center justify-center h-screen">
        {/*
          Deliberately not a <form onSubmit>: a real form submission with a
          type="password" field is exactly what triggers Chrome's "save this
          password?" prompt — and it offers to save on every submit, whether
          the token was actually accepted or not, since the browser has no
          way to know our server rejected it. A plain div + button/Enter-key
          handler avoids the native submit event entirely.
        */}
        <div className="bg-white p-8 rounded shadow-lg w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4 text-center">Admin Access</h1>
          <p className="text-sm text-gray-600 mb-4 text-center">
            Enter the admin token for this event. Leave blank if the host
            hasn't set one (local/LAN play).
          </p>
          {hasAttempted && (
            <p className="text-sm text-red-600 mb-4 text-center">
              That token was rejected — try again.
            </p>
          )}
          <input
            type="password"
            autoComplete="off"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmitToken();
            }}
            className="w-full border rounded p-2 mb-4"
            placeholder="Admin token"
            autoFocus
          />
          <button
            type="button"
            onClick={handleSubmitToken}
            className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
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
          <button
            onClick={() => {
              // Reconnect with a blank token — the server will reject it
              // (unless no ADMIN_TOKEN is configured) and adminAuthStatus
              // will flip to "denied", bringing back the entry form.
              setTokenInput("");
              setHasAttempted(false);
              setAdminToken("");
            }}
            className="p-2 bg-gray-500 text-white rounded"
          >
            Change Admin Token
          </button>
        </span>
      </div>

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
