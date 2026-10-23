import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createInitialQuestionState, isPartyGame } from "../shared/partyGames";
import {
  FamilyFeudQuestionState,
  GameName,
  GameState,
  getCurrentQuestion,
  getGameTitle,
  HeadToHeadQuestionState,
  MillionaireQuestionState,
  MinuteQuestionState,
} from "../shared/types";
import AdminPageWrapper from "./AdminPageWrapper";
import { customColumnTitle, tileGame } from "../shared/boardLayout";
import GameOverScreen from "./GameOverScreen";
import IntermissionScreen from "./IntermissionScreen";
import TimerControls from "./TimerControls";
import GameSetupModal from "./GameSetupModal";
import SettingsModal from "./SettingsModal";
import { getStoredAdminKey, useSocket } from "./SocketContext";
import TokenInput from "./TokenInput";
import { useTheme } from "./useTheme";

type AdminStatus = "joining" | "authorized" | "denied" | "not_found";

interface AdminHostProps {
  code?: string;
  gameState: GameState;
  sendGameStateToServer: (gameState: GameState) => void;
  // Settings' reset: a fresh game (the server rebuilds it for a room).
  onReset: () => void;
  // The lobby's Game setup (teams, theme, pack) needs a room on the server.
  canChangeSetup?: boolean;
}

// The host's page for a game state: toolbar, board, question panels, pause
// and game-over screens, and their handlers. Admin feeds it from a room; the
// sandbox's full game run-through feeds it local state.
export const AdminHost: React.FC<AdminHostProps> = ({
  code,
  gameState,
  sendGameStateToServer,
  onReset,
  canChangeSetup = false,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const handleReset = onReset;

  const handleSaveSettings = (updatedGameState: GameState) => {
    sendGameStateToServer(updatedGameState);
  };

  // Lobby music plays on the TV only before the game starts (useLobbyMusic).
  const handleToggleLobbyMusic = () => {
    if (!gameState) return;
    sendGameStateToServer({ ...gameState, lobbyMusic: !gameState.lobbyMusic });
  };

  // "We'll be right back": the TV switches to IntermissionScreen until the
  // host resumes; nothing else about the game changes.
  const handleSetPaused = (paused: boolean) => {
    if (!gameState) return;
    sendGameStateToServer({ ...gameState, paused });
  };

  const handleShuffleLobbyMusic = () => {
    if (!gameState) return;
    sendGameStateToServer({
      ...gameState,
      lobbyMusicShuffle: (gameState.lobbyMusicShuffle ?? 0) + 1,
    });
  };

  const handleEndGame = () => {
    if (!gameState) return;
    sendGameStateToServer({ ...gameState, gameOver: true });
  };

  const handleBackToBoard = () => {
    if (!gameState) return;
    sendGameStateToServer({ ...gameState, gameOver: false });
  };


  // A custom board's column title (e.g. "Smith Family Feud") on the tile card
  // and question page; the Standard game keeps its usual titles.
  const tileTitle = (game: GameName) =>
    (gameState && customColumnTitle(gameState, game)) || getGameTitle(game);

  // `column` is the board column that was clicked; the tile may play as
  // another game in a custom pack (e.g. Scavenger Sprint in Head to Head).
  const handleUpdateCurrentGame = (column: GameName, points: number) => {
    if (!gameState) return;
    const slotKey = gameState.isDoubleJeopardy ? points / 2 + 1 : points;
    const newGame = tileGame(gameState, column, slotKey) as GameName;
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
          gameTitle: tileTitle(column),
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
          gameTitle: tileTitle(column),
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
          gameTitle: tileTitle(column),
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
          gameTitle: tileTitle(column),
          value: points,
          questionState: questionState,
        };
        break;
      }
      default: {
        // Party games build their state in shared/partyGames.ts (the sandbox
        // uses the same factory). The tile's question is looked up only for
        // its optional clock length.
        const question = isPartyGame(newGame)
          ? getCurrentQuestion(
              (gameState.gameData[newGame as keyof typeof gameState.gameData] ?? {}) as Record<
                string,
                { seconds?: number }
              >,
              { ...gameState, currentGame: { ...gameState.currentGame, gameName: newGame, value: points, column } }
            )
          : undefined;
        updatedGameState.currentGame = {
          gameName: newGame,
          gameTitle: tileTitle(column),
          value: points,
          questionState: isPartyGame(newGame)
            ? createInitialQuestionState(newGame, gameState.teams, question)
            : { promptVisible: false },
        };
        break;
      }
    }

    // Remember the clicked column when the tile plays as another game, so
    // awarding it marks the right board tile as used.
    if (newGame !== column) {
      updatedGameState.currentGame = { ...updatedGameState.currentGame, column };
    }

    sendGameStateToServer(updatedGameState);
  };

  const handleUpdateTurn = (teamId: string) => {
    if (!gameState) return;

    const updatedGameState = { ...gameState };
    updatedGameState.whoseTurn = teamId;

    sendGameStateToServer(updatedGameState);
  };

  const handleAddPoints = (
    teamId: string,
    points: number,
    gameName: GameName,
    noPointsOverride: boolean
  ) => {
    if (!gameState) return;
    const updatedGameState = { ...gameState };
    const team = updatedGameState.teams.find((t) => t.id === teamId);
    if (!team) return;

    if (!noPointsOverride) {
      team.score += points;
      // Sound plays from Scoreboard's own score-change effect instead of
      // here, so it comes from the display tab rather than this admin tab.
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

    // "No one gets points" isn't anyone's turn ending in a win — leave the
    // turn where it was instead of handing it to whichever team the button
    // happened to be wired to.
    if (!noPointsOverride) {
      updatedGameState.whoseTurn = teamId;
    } else {
      // The TV's sad sound + animation (NoPointsFlash).
      updatedGameState.noPointsCount = (gameState.noPointsCount ?? 0) + 1;
    }
    sendGameStateToServer(updatedGameState);
  };

  const handleBackButton = () => {
    if (!gameState) return;

    // Leaving a tile also puts the timer away (it would otherwise cover the
    // board); Toggle Timer brings it back, paused, in the corner.
    const updatedGameState = { ...gameState, showTimer: false, timerPlaying: false, timerFullScreen: false };
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
    if (!gameState) return;
    const updatedGameState = { ...gameState };
    updatedGameState.currentGame.questionState.promptVisible = true;

    sendGameStateToServer(updatedGameState);
  };

  return (
    <div className="admin-container">
      {/*
        z-50: without an explicit z-index, this fixed toolbar paints in DOM
        order relative to its siblings — TitlePage (full-viewport, no
        z-index of its own) is later in the tree and was covering it
        entirely on the pre-game screen despite `fixed` positioning, which
        only opts out of normal layout flow, not stacking order.
      */}
      <div className="fixed top-2 right-2 sm:top-4 sm:right-4 z-50 max-w-[160px] sm:max-w-none">
        {/* Wrap buttons in a span for alignment. flex-wrap + a constrained
            max-width on mobile lets this stack to a couple of lines in the
            corner instead of stretching across the screen and colliding with
            page titles, which is fine at desktop/TV widths without the cap. */}
        <span className="flex flex-wrap justify-end gap-1 sm:gap-2">
          {canChangeSetup && !gameState.started && !gameState.gameOver && (
            <button
              onClick={() => setIsSetupOpen(true)}
              className="p-1.5 sm:p-2 text-xs sm:text-base bg-blue-500 text-white rounded"
            >
              ⚙️ Game setup
            </button>
          )}
          {/* Music plays in the lobby, and during a pause. */}
          {(!gameState.started || gameState.paused) && !gameState.gameOver && (
            <button
              onClick={handleToggleLobbyMusic}
              aria-pressed={!!gameState.lobbyMusic}
              className={`p-1.5 sm:p-2 text-xs sm:text-base text-white rounded ${
                gameState.lobbyMusic ? "bg-purple-600" : "bg-gray-500"
              }`}
            >
              {gameState.lobbyMusic ? "🎵 Music on" : "🎵 Music off"}
            </button>
          )}
          {(!gameState.started || gameState.paused) && !gameState.gameOver && gameState.lobbyMusic && (
            <button
              onClick={handleShuffleLobbyMusic}
              className="p-1.5 sm:p-2 text-xs sm:text-base bg-purple-600 text-white rounded"
            >
              🔀 Shuffle
            </button>
          )}
          {/* The timer is for gameplay only: hidden in the lobby and on the
              game-over screen. */}
          {gameState.started && !gameState.gameOver && !gameState.paused && (
            <TimerControls gameState={gameState} sendGameStateToServer={sendGameStateToServer} />
          )}
          {gameState.started && !gameState.gameOver && !gameState.paused && (
            <button
              onClick={() => handleSetPaused(true)}
              className="p-1.5 sm:p-2 text-xs sm:text-base bg-orange-500 text-white rounded"
            >
              ⏸ Pause game
            </button>
          )}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 sm:p-2 text-xs sm:text-base bg-blue-500 text-white rounded"
          >
            Settings
          </button>
        </span>
      </div>

      {/* Lobby only; closes itself if the game starts meanwhile. */}
      {canChangeSetup && isSetupOpen && code && !gameState.started && (
        <GameSetupModal code={code} gameState={gameState} onClose={() => setIsSetupOpen(false)} />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
        onReset={handleReset}
        onEndGame={handleEndGame}
        gameState={gameState}
      />

      {gameState.gameOver ? (
        // The host sees the same standings as the TV, plus the way out.
        <div className="min-h-screen bg-gradient-to-b from-ink to-deep">
          <GameOverScreen
            teams={gameState.teams}
            isAdmin
            onBackToBoard={handleBackToBoard}
            onPlayAgain={handleReset}
          />
        </div>
      ) : gameState.started && gameState.paused ? (
        // The same break screen as the TV, plus the message box and Resume.
        <div className="min-h-screen bg-gradient-to-br from-glow via-ink to-ink">
          <IntermissionScreen
            gameState={gameState}
            isAdmin
            code={code}
            onResume={() => handleSetPaused(false)}
            onMessageChange={(pauseMessage) => sendGameStateToServer({ ...gameState, pauseMessage })}
          />
        </div>
      ) : (
      <AdminPageWrapper
        gameState={gameState}
        code={code}
        handleUpdateCurrentGame={handleUpdateCurrentGame}
        handleAddPoints={handleAddPoints}
        handleRevealQuestion={handleRevealQuestion}
        handleBackButon={handleBackButton}
        sendGameStateToServer={sendGameStateToServer}
        handleUpdateTurn={handleUpdateTurn}
      />
      )}
    </div>
  );
};

// Admin has no state passed down from a parent — it owns the room it's
// scoped to (from the URL) end to end: joining it, tracking whether this
// browser holds admin rights for it, and holding the resulting GameState.
const Admin: React.FC = () => {
  const { code: rawCode } = useParams<{ code: string }>();
  const code = rawCode?.toUpperCase();
  const socket = useSocket();

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

  const handleReset = async () => {
    if (socket && code) {
      socket.emit("resetGameState", { code });
    }
  };
  // The host sees the game in its theme too. Before the early returns below
  // (hooks can't be conditional).
  useTheme(gameState?.theme);

  if (status === "not_found") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
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
      <div className="flex items-center justify-center min-h-screen text-gray-500 italic px-4 text-center">
        Joining game...
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        {/*
          Deliberately not a <form onSubmit>: a real form submission with a
          type="password" field is exactly what triggers Chrome's "save this
          password?" prompt — and it offers to save on every submit, whether
          the token was actually accepted or not, since the browser has no
          way to know our server rejected it. A plain div + button/Enter-key
          handler avoids the native submit event entirely.
        */}
        <div className="bg-white p-6 sm:p-8 rounded shadow-lg w-full max-w-sm">
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
          <TokenInput value={tokenInput} onChange={setTokenInput} onEnter={handleSubmitToken} className="mb-4" />
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
    <AdminHost
      code={code}
      gameState={gameState}
      sendGameStateToServer={sendGameStateToServer}
      onReset={handleReset}
      canChangeSetup
    />
  );
};

export default Admin;
