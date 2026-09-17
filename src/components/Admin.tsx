import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
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
import { getStoredAdminKey, useSocket } from "./SocketContext";

type AdminStatus = "joining" | "authorized" | "denied" | "not_found";

// Admin has no state passed down from a parent — it owns the room it's
// scoped to (from the URL) end to end: joining it, tracking whether this
// browser holds admin rights for it, and holding the resulting GameState.
const Admin: React.FC = () => {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = rawCode?.toUpperCase();
  const socket = useSocket();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<AdminStatus>("joining");
  const [tokenInput, setTokenInput] = useState("");
  // Only show "that token was rejected" once they've actually tried one —
  // "denied" on the very first attempt just means nobody's entered a token
  // for this browser/room yet, not that one was wrong.
  const [hasAttempted, setHasAttempted] = useState(false);

  // Join (or rejoin, on reconnect) this room. The adminKey cached when this
  // browser created the room re-establishes admin rights automatically; if
  // it's missing or wrong, adminAuthResult comes back false and the
  // token-entry fallback below takes over.
  useEffect(() => {
    if (!socket || !code) return;

    const attemptJoin = () => {
      socket.emit("joinGame", { code, adminKey: getStoredAdminKey(code) });
    };
    const handleJoined = (data: { code: string; gameState: GameState }) => {
      if (data.code !== code) return;
      setGameState(data.gameState);
    };
    const handleAuthResult = (data: { isAdmin: boolean }) => {
      setStatus(data.isAdmin ? "authorized" : "denied");
    };
    const handleNotFound = () => setStatus("not_found");
    // The server only routes this to sockets it has joined to this room, but
    // a socket can end up briefly in more than one room's group when
    // switching games without a full page reload (see server.ts's
    // leaveCurrentRoom) — checking the code here is cheap insurance against
    // ever rendering another room's state.
    const handleGameStateUpdate = (data: { code: string; gameState: GameState }) => {
      if (data.code !== code) return;
      setGameState(data.gameState);
    };
    const handleUnauthorized = () => setStatus("denied");

    socket.on("connect", attemptJoin);
    socket.on("gameJoined", handleJoined);
    socket.on("adminAuthResult", handleAuthResult);
    socket.on("gameNotFound", handleNotFound);
    socket.on("gameStateUpdate", handleGameStateUpdate);
    socket.on("unauthorized", handleUnauthorized);

    if (socket.connected) attemptJoin();

    return () => {
      socket.off("connect", attemptJoin);
      socket.off("gameJoined", handleJoined);
      socket.off("adminAuthResult", handleAuthResult);
      socket.off("gameNotFound", handleNotFound);
      socket.off("gameStateUpdate", handleGameStateUpdate);
      socket.off("unauthorized", handleUnauthorized);
    };
  }, [socket, code]);

  const handleSubmitToken = () => {
    if (!socket || !code) return;
    setHasAttempted(true);
    socket.emit("joinGame", { code, adminToken: tokenInput });
  };

  const sendGameStateToServer = (updatedGameState: GameState) => {
    if (socket && code) {
      socket.emit("gameStateUpdate", { code, gameState: updatedGameState });
    }
  };

  const handleSaveSettings = (updatedGameState: GameState) => {
    sendGameStateToServer(updatedGameState);
  };

  const handleReset = async () => {
    if (socket && code) {
      socket.emit("resetGameState", { code });
    }
  };

  const handleToggleTimer = () => {
    if (!gameState) return;
    const updatedGameState = { ...gameState };
    updatedGameState.showTimer = !updatedGameState.showTimer;
    sendGameStateToServer(updatedGameState);
  };

  const handleUpdateCurrentGame = (newGame: GameName, points: number) => {
    if (!gameState) return;
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
    if (!socket || !gameState) return;

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
    if (!socket || !gameState) return;
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
    if (!socket || !gameState) return;

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
    if (!socket || !gameState) return;
    const updatedGameState = { ...gameState };
    updatedGameState.currentGame.questionState.promptVisible = true;

    sendGameStateToServer(updatedGameState);
  };

  if (status === "not_found") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Game not found</h1>
        <p className="text-gray-600">
          No game is running with code "{code}". It may have expired, or
          create a new one from /admin.
        </p>
      </div>
    );
  }

  if (status === "joining" || !gameState) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 italic">
        Joining game...
      </div>
    );
  }

  if (status === "denied") {
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
            This browser isn't recognized as the admin for game "{code}".
            Enter the venue's admin token to reclaim control.
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
      {/*
        z-50: without an explicit z-index, this fixed toolbar paints in DOM
        order relative to its siblings — TitlePage (full-viewport, no
        z-index of its own) is later in the tree and was covering it
        entirely on the pre-game screen despite `fixed` positioning, which
        only opts out of normal layout flow, not stacking order.
      */}
      <div className="fixed top-4 right-4 z-50">
        {/* Wrap buttons in a span for alignment */}
        <span className="flex space-x-2">
          <div className="p-2 bg-white border rounded font-mono font-bold tracking-widest">
            {code}
          </div>
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
              setTokenInput("");
              setHasAttempted(false);
              setStatus("denied");
            }}
            className="p-2 bg-gray-500 text-white rounded"
          >
            Reclaim Admin Access
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
