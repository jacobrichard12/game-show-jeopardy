import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import gameBoardData from "../data/gameBoard.json";
import { hasUserActivation, setMuted, unlockAudio, useMuted } from "../shared/sound";
import { GameState } from "../shared/types";
import PageWrapper from "./PageWrapper";
import { useSocket } from "./SocketContext";
import TitlePage from "./TitlePage";

type JoinStatus = "joining" | "joined" | "not_found";

// The spectator/projector view for one specific room, joined by its code.
// Read-only: it never sends state, only receives it.
const Display: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const socket = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<JoinStatus>("joining");
  const muted = useMuted();
  // Browsers block all audio until the page has had a user gesture. Arriving
  // via a click (e.g. from the join screen) already counts; opening
  // /watch/:code directly doesn't, and every sound would then silently fail.
  const [needsSoundPrompt, setNeedsSoundPrompt] = useState(
    () => !hasUserActivation()
  );

  // Full-screen "DOUBLE JEOPARDY!" card when the round is switched on. The
  // ref starts unset so joining a room that's already in Double Jeopardy
  // doesn't replay the reveal.
  const [showDjReveal, setShowDjReveal] = useState(false);
  const wasDoubleJeopardy = useRef<boolean | null>(null);
  const isDoubleJeopardy = gameState?.isDoubleJeopardy;
  useEffect(() => {
    if (isDoubleJeopardy === undefined) return;
    const prev = wasDoubleJeopardy.current;
    wasDoubleJeopardy.current = isDoubleJeopardy;
    if (prev === false && isDoubleJeopardy) {
      setShowDjReveal(true);
      const timer = setTimeout(() => setShowDjReveal(false), 2600);
      return () => clearTimeout(timer);
    }
  }, [isDoubleJeopardy]);

  useEffect(() => {
    if (!socket || !code) return;
    const upperCode = code.toUpperCase();

    // Re-sent on every (re)connect, not just once on mount, so a dropped
    // connection rejoins the same room automatically once it reconnects.
    const join = () => socket.emit("joinGame", { code: upperCode });

    const handleJoined = (data: { code: string; gameState: GameState }) => {
      if (data.code !== upperCode) return;
      setGameState(data.gameState);
      setStatus("joined");
    };
    const handleNotFound = () => setStatus("not_found");
    // The server only routes this to sockets it has joined to this room, but
    // a socket can end up briefly in more than one room's group when
    // switching games without a full page reload (see server.ts's
    // leaveCurrentRoom) — checking the code here is cheap insurance against
    // ever rendering another room's state.
    const handleGameStateUpdate = (data: { code: string; gameState: GameState }) => {
      if (data.code !== upperCode) return;
      setGameState(data.gameState);
    };

    socket.on("connect", join);
    socket.on("gameJoined", handleJoined);
    socket.on("gameNotFound", handleNotFound);
    socket.on("gameStateUpdate", handleGameStateUpdate);

    if (socket.connected) join();

    return () => {
      socket.off("connect", join);
      socket.off("gameJoined", handleJoined);
      socket.off("gameNotFound", handleNotFound);
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [socket, code]);

  if (status === "not_found") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Game not found</h1>
        <p className="text-gray-600">
          No game is running with code "{code?.toUpperCase()}". Double-check
          the code with your host.
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

  return (
    // Dark game-show backdrop for the whole display, so Double Jeopardy can
    // shift the entire screen's mood instead of a grey box floating in white.
    <div
      className={`min-h-screen transition-colors duration-700 bg-gradient-to-b ${
        gameState.isDoubleJeopardy
          ? "from-[#1a0b14] via-[#3b0d2a] to-[#7c2d12]"
          : "from-ink to-indigo-950"
      }`}
    >
      {!gameState.started ? (
        <TitlePage
          isAdmin={false}
          code={code?.toUpperCase()}
          gameState={gameState}
          sendGameStateToServer={() => {}}
        />
      ) : (
        <>
          <PageWrapper gameState={gameState} gameBoardData={gameBoardData} />
          {/* Room code stays on screen after the game starts, for latecomers. */}
          <div className="fixed top-2 left-2 z-40 rounded bg-black/60 px-3 py-1 font-mono text-sm text-white sm:text-lg xl:text-3xl">
            Join: <span className="font-bold tracking-widest">{code?.toUpperCase()}</span>
          </div>
        </>
      )}

      {showDjReveal && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-dj-reveal">
          <p className="text-center text-5xl font-semibold text-amber-300 drop-shadow-lg sm:text-7xl md:text-9xl">
            DOUBLE JEOPARDY!
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMuted(!muted)}
        aria-label={muted ? "Unmute sound" : "Mute sound"}
        className="fixed bottom-2 right-2 z-40 rounded-full bg-black/60 px-3 py-2 text-sm text-white hover:bg-black/80"
      >
        {muted ? "🔇 Sound off" : "🔊 Sound on"}
      </button>

      {needsSoundPrompt && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/80 p-4 text-center">
          <p className="text-2xl font-bold text-white sm:text-4xl">
            Turn on sound for this screen
          </p>
          <p className="text-white/80">
            Your browser blocks game sounds until you tap once.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                unlockAudio();
                setMuted(false);
                setNeedsSoundPrompt(false);
              }}
              className="rounded-lg bg-accent px-6 py-3 text-lg font-semibold text-ink hover:brightness-110"
            >
              Enable sound
            </button>
            <button
              type="button"
              onClick={() => {
                setMuted(true);
                setNeedsSoundPrompt(false);
              }}
              className="rounded-lg bg-white/20 px-6 py-3 text-lg text-white hover:bg-white/30"
            >
              Continue without sound
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Display;
