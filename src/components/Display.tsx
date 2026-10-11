import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { gameStartAudio, winnerFanfareAudio } from "../shared/audio";
import { hasUserActivation, playSound, setMuted, unlockAudio } from "../shared/sound";
import { GameName, GameState, tileColumn } from "../shared/types";
import { useWakeLock } from "../shared/wakeLock";
import { nextIntroKey, tileColors } from "./GameBoard";
import GameOverScreen from "./GameOverScreen";
import PageWrapper from "./PageWrapper";
import SoundMenu from "./SoundMenu";
import { useLobbyMusic } from "./useLobbyMusic";
import { useTheme } from "./useTheme";
import { useSocket } from "./SocketContext";
import StartTunnel, { BOARD_ZOOM_CLASS, TITLE_EXIT_CLASS, TUNNEL_MS } from "./StartTunnel";
import TitlePage from "./TitlePage";

type JoinStatus = "joining" | "joined" | "not_found";

// The tile-pick card sits at a fixed spot in the middle of the screen; it
// starts shrunk onto the picked tile (CSS variables read by the tile-zoom
// keyframes in tailwind.config.js) and grows into place.
const PICK_CARD_MS = 1800;
const CARD = { left: 10, top: 20, width: 80, height: 60 }; // % of the viewport
interface PickCard {
  title: string;
  value: number;
  doubleJeopardy: boolean; // colors the card like the tile it grows from
  from: React.CSSProperties | null; // null = tile not found, zoom from the middle
}
function zoomFrom(tile: DOMRect): React.CSSProperties | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!tile.width || !tile.height || !vw || !vh) return null;
  const cardW = (CARD.width / 100) * vw;
  const cardH = (CARD.height / 100) * vh;
  const cardX = (CARD.left / 100) * vw + cardW / 2;
  const cardY = (CARD.top / 100) * vh + cardH / 2;
  return {
    "--zoom-x": `${tile.left + tile.width / 2 - cardX}px`,
    "--zoom-y": `${tile.top + tile.height / 2 - cardY}px`,
    "--zoom-sx": `${tile.width / cardW}`,
    "--zoom-sy": `${tile.height / cardH}`,
  } as React.CSSProperties;
}

// The spectator/projector view for one specific room, joined by its code.
// Read-only: it never sends state, only receives it.
const Display: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const socket = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<JoinStatus>("joining");
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
  // Bumped to replay the board's category intro (see below).
  const [boardIntro, setBoardIntro] = useState(0);
  const startIntro = () => setBoardIntro(nextIntroKey());
  const wasDoubleJeopardy = useRef<boolean | null>(null);
  const isDoubleJeopardy = gameState?.isDoubleJeopardy;
  useEffect(() => {
    if (isDoubleJeopardy === undefined) return;
    const prev = wasDoubleJeopardy.current;
    wasDoubleJeopardy.current = isDoubleJeopardy;
    if (prev === false && isDoubleJeopardy) {
      setShowDjReveal(true);
      // The Double Jeopardy board's categories flip in once the card is gone.
      const timer = setTimeout(() => {
        setShowDjReveal(false);
        startIntro();
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [isDoubleJeopardy]);

  // Board category intro (headers flip in one by one): when the game starts,
  // when the host switches board pages, and right after the Double Jeopardy
  // card (above). Refs start unset so a TV joining mid-game doesn't replay it.
  const wasStarted = useRef<boolean | null>(null);
  // Bumped on Start Game: the tunnel into the board (StartTunnel).
  const [startTunnel, setStartTunnel] = useState(0);
  // The title screen lingers over the board during the tunnel (TITLE_EXIT_CLASS).
  const [leavingTitle, setLeavingTitle] = useState(false);
  useEffect(() => {
    if (!leavingTitle) return;
    const timer = setTimeout(() => setLeavingTitle(false), TUNNEL_MS);
    return () => clearTimeout(timer);
  }, [leavingTitle]);
  const started = gameState ? !!gameState.started : undefined;
  useEffect(() => {
    if (started === undefined) return;
    const prev = wasStarted.current;
    wasStarted.current = started;
    if (prev === false && started) {
      startIntro();
      playSound(gameStartAudio);
      setStartTunnel((n) => n + 1);
      setLeavingTitle(true);
    }
  }, [started]);
  const prevBoardPage = useRef<string | null>(null);
  const boardPage = gameState ? gameState.boardPage ?? "classic" : undefined;
  useEffect(() => {
    if (boardPage === undefined) return;
    const prev = prevBoardPage.current;
    prevBoardPage.current = boardPage;
    if (prev !== null && prev !== boardPage) startIntro();
  }, [boardPage]);

  // Tile-pick card, like the show: the picked tile grows from its spot on the
  // board into a big card in the middle (category + value), holds, then the
  // question page takes over. The board stays on screen underneath until then
  // (`boardSnapshot` = the last board state).
  const [pickCard, setPickCard] = useState<PickCard | null>(null);
  const boardSnapshot = useRef<GameState | null>(null);
  useEffect(() => {
    if (gameState?.currentGame.gameName === GameName.BOARD) boardSnapshot.current = gameState;
  }, [gameState]);
  const prevGameName = useRef<GameName | null>(null);
  const currentGame = gameState?.currentGame;
  // True from the very first render after a pick (before the effect below
  // has run), so the question page never flashes up ahead of the card.
  const justPicked =
    prevGameName.current === GameName.BOARD &&
    !!currentGame &&
    currentGame.gameName !== GameName.BOARD;
  // Layout effect: measure the tile on the still-showing board before paint.
  useLayoutEffect(() => {
    if (!currentGame) return;
    const prev = prevGameName.current;
    prevGameName.current = currentGame.gameName;
    if (prev === GameName.BOARD && currentGame.gameName !== GameName.BOARD) {
      const tile = document.querySelector(
        `[data-tile="${tileColumn(currentGame)}-${currentGame.value}"]`
      );
      setPickCard({
        title: currentGame.gameTitle,
        value: currentGame.value,
        doubleJeopardy: !!gameState?.isDoubleJeopardy,
        from: tile ? zoomFrom(tile.getBoundingClientRect()) : null,
      });
      const timer = setTimeout(() => setPickCard(null), PICK_CARD_MS);
      return () => clearTimeout(timer);
    }
    // Any other change (e.g. the host backs out to the board within 1.8 s)
    // ends a card still showing; its timer was cancelled by the cleanup.
    setPickCard(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGame?.gameName, currentGame?.value]);
  const showBoardUnderCard = (pickCard !== null || justPicked) && boardSnapshot.current;

  // Fanfare once when the host ends the game. Like the DJ reveal, the ref
  // starts unset so a TV joining a room that's already over stays quiet.
  const wasGameOver = useRef<boolean | null>(null);
  const isGameOver = gameState ? !!gameState.gameOver : undefined;
  useEffect(() => {
    if (isGameOver === undefined) return;
    const prev = wasGameOver.current;
    wasGameOver.current = isGameOver;
    if (prev === false && isGameOver) playSound(winnerFanfareAudio);
  }, [isGameOver]);

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

  // The TV is never clicked, so keep it from sleeping while a game is up.
  // Called before the early returns below (hooks can't be conditional).
  useWakeLock(status === "joined");
  useTheme(gameState?.theme);
  // Lobby only: the host's music toggle, on the title screen before the game
  // starts. Waits for the "enable sound" click, which browsers require.
  useLobbyMusic(
    status === "joined" &&
      !!gameState?.lobbyMusic &&
      !gameState.started &&
      !gameState.gameOver &&
      !needsSoundPrompt,
    gameState?.lobbyMusicShuffle ?? 0
  );

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
          ? "from-dj-from via-dj-via to-dj-to"
          : "from-ink to-deep"
      }`}
    >
      {gameState.gameOver ? (
        <GameOverScreen teams={gameState.teams} isAdmin={false} />
      ) : !gameState.started ? (
        <TitlePage
          isAdmin={false}
          code={code?.toUpperCase()}
          gameState={gameState}
          sendGameStateToServer={() => {}}
        />
      ) : (
        <>
          {/* After Start Game the board zooms in at the end of the tunnel.
              The first started render is caught too (wasStarted still false
              there), so the board never flashes full size before it. */}
          <div
            className={
              startTunnel > 0 || wasStarted.current === false ? BOARD_ZOOM_CLASS : undefined
            }
          >
            <PageWrapper
              gameState={showBoardUnderCard ? boardSnapshot.current! : gameState}
              boardIntro={boardIntro}
            />
          </div>
          {/* Room code stays on screen after the game starts, for latecomers. */}
          <div className="fixed top-2 left-2 z-40 rounded bg-black/60 px-3 py-1 font-mono text-sm text-white sm:text-lg xl:text-3xl">
            Join: <span className="font-bold tracking-widest">{code?.toUpperCase()}</span>
          </div>
        </>
      )}

      {gameState.started &&
        !gameState.gameOver &&
        (leavingTitle || wasStarted.current === false) && (
          <div className={TITLE_EXIT_CLASS}>
            <TitlePage
              isAdmin={false}
              code={code?.toUpperCase()}
              gameState={gameState}
              sendGameStateToServer={() => {}}
            />
          </div>
        )}
      <StartTunnel tunnelKey={startTunnel} decor={gameState.titleScreen?.decor} />

      {pickCard && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30 motion-safe:animate-fade-in" />
          <div
            className={`absolute flex flex-col items-center justify-center gap-4 rounded-3xl ${
              tileColors(pickCard.doubleJeopardy).bg
            } px-6 text-center shadow-2xl motion-safe:animate-tile-zoom`}
            style={{
              left: `${CARD.left}vw`,
              top: `${CARD.top}vh`,
              width: `${CARD.width}vw`,
              height: `${CARD.height}vh`,
              ...(pickCard.from ?? {}),
            }}
          >
            <p className="font-display text-2xl font-semibold uppercase tracking-widest text-white sm:text-4xl xl:text-6xl">
              {pickCard.title}
            </p>
            <p
              className={`font-display text-6xl font-semibold ${
                tileColors(pickCard.doubleJeopardy).value
              } sm:text-8xl xl:text-[10rem]`}
            >
              ${pickCard.value}
            </p>
          </div>
        </div>
      )}

      {showDjReveal && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-dj-reveal">
          <p className="text-center text-5xl font-semibold text-dj-accent drop-shadow-lg sm:text-7xl md:text-9xl">
            DOUBLE JEOPARDY!
          </p>
        </div>
      )}

      <SoundMenu />

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
