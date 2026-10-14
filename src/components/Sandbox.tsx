import React, { useEffect, useRef, useState } from "react";
// Filler content only (ROADMAP S2): whatever this page imports ships in the
// public JS bundle, so real questions must never be imported here.
import sandboxFeud from "../data/sandbox/feud.json";
import headToHeadBank from "../data/sandbox/head.json";
import sandboxMillionaire from "../data/sandbox/millionaire.json";
import minuteBank from "../data/sandbox/minute.json";
import partyGames from "../data/sandbox/party.json";
import { createInitialQuestionState, updateQuestionState } from "../shared/partyGames";
import { awardPoints } from "../shared/scoring";
import { buildMillionaireQuestions, buildSlotBank, DifficultyBank, MillionairePool } from "../shared/slots";
import { teamColor } from "../shared/teamColors";
import { ThemeId, THEMES } from "../shared/themes";
import {
  CharadesPrompt,
  ClosestQuestion,
  createDefaultTeams,
  FamilyFeudQuestion,
  GameData,
  GameName,
  GameState,
  getCurrentQuestion,
  getGameTitle,
  HeadToHeadQuestion,
  MAX_TEAMS,
  MinuteQuestion,
  MIN_TEAMS,
  OrderPuzzle,
  PerformPrompt,
  QuestionProps,
  SandboxPack,
  ScavengerItem,
  WheelPuzzle as WheelPuzzleData,
} from "../shared/types";
import { tileGame } from "../shared/boardLayout";
import { gameStartAudio } from "../shared/audio";
import { playSound } from "../shared/sound";
import ActDrawDescribe from "./ActDrawDescribe";
import AdminPointsButtons, { NoPointsButton } from "./AddPointsButtons";
import ClosestWins from "./ClosestWins";
import FamilyFeud from "./FamilyFeud";
import FitToScreen from "./FitToScreen";
import NoPointsFlash from "./NoPointsFlash";
import { AdminHost } from "./Admin";
import { boardData } from "./boards";
import { DisplayScreen } from "./Display";
import GameBoard from "./GameBoard";
import { readStoredToken } from "./sandboxToken";
import StartTunnel, { BOARD_ZOOM_CLASS, TITLE_EXIT_CLASS, TUNNEL_MS } from "./StartTunnel";
import TitlePage from "./TitlePage";
import SideCharades from "./SideCharades";
import { useOptionalSocket } from "./SocketContext";
import Timer from "./Timer";
import VirtualScreen from "./VirtualScreen";
import TimerControls from "./TimerControls";
import HeadToHead from "./HeadToHead";
import Millionaire from "./Millionaire";
import Minute from "./Minute";
import PutInOrder from "./PutInOrder";
import QuestionWrapper from "./QuestionWrapper";
import ReverseCharades from "./ReverseCharades";
import ScavengerSprint from "./ScavengerSprint";
import ScoreBoard from "./Scoreboard";
import WheelPuzzle from "./WheelPuzzle";
import { useTheme } from "./useTheme";

// A test bench for every tile game (the four original games and the party
// games from ROADMAP Tier 5) at /sandbox. It runs a game locally with no
// server and no room code: one GameState in React state, shown twice — as the
// host panel and as the TV — using the very same game components, scoring
// buttons and scoreboard as a real room. "Sending" state is just setState here.

type BankKey =
  | "feud"
  | "minute"
  | "millionaire"
  | "head"
  | "wheel"
  | "act"
  | "scavenger"
  | "closest"
  | "order"
  | "charades";

interface ModeDef {
  name: GameName;
  bank: BankKey;
  group: "party" | "original";
  Component: React.FC<QuestionProps>;
  howTo: string;
}

const MODES: ModeDef[] = [
  {
    name: GameName.WHEEL,
    bank: "wheel",
    group: "party",
    Component: WheelPuzzle,
    howTo:
      "Teams call letters in turn; tap each letter on the host panel. A miss passes the turn. If a team guesses the whole thing wrong, hit Wrong guess (big X on the TV, turn passes). Reveal puzzle plays a cheer. No two vowels in a row: after a correct vowel the other vowels grey out until a consonant is called. Then award the tile.",
  },
  {
    name: GameName.ACT,
    bank: "act",
    group: "party",
    Component: ActDrawDescribe,
    howTo:
      "Set whose turn it is, start the clock, and the performer acts/draws/describes the host-only word. Award the tile if their team gets it.",
  },
  {
    name: GameName.SCAVENGER,
    bank: "scavenger",
    group: "party",
    Component: ScavengerSprint,
    howTo:
      "The item stays hidden until you click Show item & start clock; first team to bring it to the host wins the tile.",
  },
  {
    name: GameName.CLOSEST,
    bank: "closest",
    group: "party",
    Component: ClosestWins,
    howTo:
      "Enter and lock in each team's number, reveal (cheer on the TV), then award the tile to the highlighted team.",
  },
  {
    name: GameName.ORDER,
    bank: "order",
    group: "party",
    Component: PutInOrder,
    howTo:
      "Set whose turn it is; that team orders the list. Drag their answer into the numbered slots (or click an item, then a slot) and it fills in on the TV. Check answer marks each slot and plays a cheer or a sad sound. Reveal all replaces the slots with the correct order. Then award the tile or use No points.",
  },
  {
    name: GameName.CHARADES,
    bank: "charades",
    group: "party",
    Component: ReverseCharades,
    howTo:
      "Start a team's turn (full clock starts); the team acts out the word on the TV for their guesser. Tap Got it or Skip. Repeat for each team, then award the tile to the most words.",
  },
  {
    name: GameName.FAMILY_FEUD,
    bank: "feud",
    group: "original",
    Component: FamilyFeud,
    howTo:
      "Click answers on the host panel to reveal them on the TV. Wrong Answer adds an X. Show Feud Prompt reveals the question. Then award the tile. (Sample questions from your real Feud library.)",
  },
  {
    name: GameName.MILLIONAIRE,
    bank: "millionaire",
    group: "original",
    Component: Millionaire,
    howTo:
      "Reveal Next Answer shows A-D one at a time, then click the contestant's pick, Highlight Correct Answer, and Next Question (3 per tile). (Bundled sample questions, not the live OpenTDB feed.)",
  },
  {
    name: GameName.MINUTE,
    bank: "minute",
    group: "original",
    Component: Minute,
    howTo:
      "Play/Pause/Restart on the host panel drive the video on the TV. Needs internet for the YouTube embed; click the page once so the browser allows sound.",
  },
  {
    name: GameName.HEAD_TO_HEAD,
    bank: "head",
    group: "original",
    Component: HeadToHead,
    howTo:
      "The TV shows players per team; Show Title reveals the challenge. The rules (host-only) appear on the host panel.",
  },
];

const TILE_VALUES = [100, 200, 300, 400, 500];

function asBank<T>(bank: unknown): DifficultyBank<T> {
  return bank as DifficultyBank<T>;
}

// Slots the sandbox's banks into a GameData with the same scheme the server
// uses. Minute and Head to Head read the real bank files; Feud and Millionaire
// can't (the server reads CSVs from disk and calls the OpenTDB API), so they
// use bundled samples in src/data/sandbox*.json.
function buildSandboxGameData(): GameData {
  return {
    feud: buildSlotBank(asBank<FamilyFeudQuestion>(sandboxFeud)),
    minute: buildSlotBank(asBank<MinuteQuestion>(minuteBank)),
    millionaire: buildMillionaireQuestions(sandboxMillionaire as unknown as MillionairePool),
    head: buildSlotBank(asBank<HeadToHeadQuestion>(headToHeadBank)),
    wheel: buildSlotBank(asBank<WheelPuzzleData>(partyGames.wheel)),
    act: buildSlotBank(asBank<PerformPrompt>(partyGames.act)),
    scavenger: buildSlotBank(asBank<ScavengerItem>(partyGames.scavenger)),
    closest: buildSlotBank(asBank<ClosestQuestion>(partyGames.closest)),
    order: buildSlotBank(asBank<OrderPuzzle>(partyGames.order)),
    charades: buildSlotBank(asBank<CharadesPrompt>(partyGames.charades)),
  };
}

// A content pack's questions over the sample ones: tiles the pack doesn't
// fill keep their sample question, like a real game falls back to the banks.
function withPack(sample: GameData, pack: SandboxPack | null): GameData {
  if (!pack) return sample;
  const merged = { ...sample } as Record<string, Record<string, unknown>>;
  Object.entries(pack.gameData).forEach(([game, tiles]) => {
    merged[game] = { ...(merged[game] ?? {}), ...(tiles as Record<string, unknown>) };
  });
  return merged as unknown as GameData;
}

// The pack's layout and title screen, so mixed tiles, the side game and the
// TV options behave as in a real game. Without a pack: the Standard board.
function packFields(pack: SandboxPack | null): Partial<GameState> {
  if (!pack) return { board: undefined, titleScreen: undefined, hideJoinCode: undefined, noDoubleJeopardy: undefined };
  return {
    board: pack.board,
    titleScreen: pack.titleScreen,
    hideJoinCode: pack.hideJoinCode || undefined,
    noDoubleJeopardy: pack.noDoubleJeopardy || undefined,
  };
}

export function newSandboxState(teamCount: number): GameState {
  return {
    started: true,
    teams: createDefaultTeams(teamCount),
    whoseTurn: "team-1",
    currentGame: {
      gameName: GameName.BOARD,
      gameTitle: "GameBoard",
      value: 0,
      questionState: { promptVisible: false },
    },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: buildSandboxGameData(),
  };
}

// Picks a tile: points the game at `mode`'s question for that tile, with a
// fresh question state. Also clears that tile's "answered" mark so it can be
// awarded again when replaying.
function buildRound(base: GameState, mode: ModeDef, tile: number, doubleJeopardy: boolean): GameState {
  const value = doubleJeopardy ? tile * 2 : tile;
  // A content pack's tile can play as another game (e.g. Reverse Charades in
  // Head to Head): use that game's screen and question, tracked by column.
  const slotKey = doubleJeopardy ? value / 2 + 1 : value;
  const played = MODES.find((m) => m.name === tileGame(base, mode.name, slotKey)) ?? mode;
  const column = played.name !== mode.name ? { column: mode.name } : {};
  const positioned: GameState = {
    ...base,
    isDoubleJeopardy: doubleJeopardy,
    currentGame: { gameName: played.name, gameTitle: "", value, questionState: { promptVisible: false }, ...column },
  };
  const question = getCurrentQuestion(
    (positioned.gameData[played.bank] ?? {}) as unknown as Record<string, { seconds?: number }>,
    positioned
  );
  const clear = (map: { [key: string]: number[] }) => ({
    ...map,
    [mode.name]: (map[mode.name] ?? []).filter((v) => v !== value),
  });
  return {
    ...positioned,
    answered: clear(base.answered),
    doubleJeopardyAnswered: clear(base.doubleJeopardyAnswered),
    currentGame: {
      gameName: played.name,
      gameTitle: getGameTitle(played.name),
      value,
      questionState: createInitialQuestionState(played.name, base.teams, question),
      ...column,
    },
  };
}

// The Game dropdown's special entries: a pack's Reverse Charades side game,
// and the lobby title screen (with the Start Game tunnel into the board).
const SIDE_MODE = -1;
const TITLE_MODE = -2;
// The whole game as it really runs: the real host page and TV screen
// (AdminHost, DisplayScreen) driven by one local game state.
const FULL_MODE = -3;
const CHARADES_MODE = MODES.find((m) => m.name === GameName.CHARADES)!;

// A fresh sandbox game with the chosen content (sample, or a pack over it).
function freshBase(teamCount: number, pack: SandboxPack | null): GameState {
  return {
    ...newSandboxState(teamCount),
    ...packFields(pack),
    gameData: withPack(buildSandboxGameData(), pack),
  };
}

// A new full game: the lobby, with the chosen content and its layout.
function freshFullGame(teamCount: number, pack: SandboxPack | null, theme: ThemeId): GameState {
  const base = freshBase(teamCount, pack);
  return {
    ...base,
    started: false,
    theme,
    boardPage: pack?.board[0]?.id,
    currentGame: { gameName: GameName.BOARD, gameTitle: "GameBoard", value: 0, questionState: { promptVisible: false } },
  };
}

// Puts a game entry on screen: a tile for a normal entry; the board behind a
// special one (side game, title screen).
function place(base: GameState, modeIdx: number, tile: number, doubleJeopardy: boolean): GameState {
  if (modeIdx < 0) {
    return {
      ...base,
      isDoubleJeopardy: false,
      currentGame: { gameName: GameName.BOARD, gameTitle: "GameBoard", value: 0, questionState: { promptVisible: false } },
    };
  }
  return buildRound(base, MODES[modeIdx], tile, doubleJeopardy);
}

type View = "both" | "host" | "tv";

const Sandbox: React.FC = () => {
  // Previews a board theme on the TV panel (real games pick one at creation).
  const [theme, setTheme] = useState<ThemeId>("original");
  useTheme(theme);
  const [modeIdx, setModeIdx] = useState(0);
  const [tile, setTile] = useState(100);
  const [doubleJeopardy, setDoubleJeopardy] = useState(false);
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  const [view, setView] = useState<View>("both");
  // Both view, side by side (xl+): the host panel's share of the width, %,
  // set by dragging the divider between the panels (like macOS split view).
  const [hostShare, setHostShare] = useState(50);
  const [dragging, setDragging] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const clampShare = (share: number) => Math.min(80, Math.max(20, share));
  const dragTo = (clientX: number) => {
    const box = mainRef.current?.getBoundingClientRect();
    if (box && box.width > 0 && Number.isFinite(clientX)) setHostShare(clampShare(((clientX - box.left) / box.width) * 100));
  };
  const [showState, setShowState] = useState(false);
  // Bumped whenever a round (re)starts so game components remount and drop
  // any local input state (e.g. half-typed guesses).
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState<GameState>(() =>
    buildRound(newSandboxState(MIN_TEAMS), MODES[0], 100, false)
  );

  // Content: the bundled samples, or a content pack loaded from the server
  // behind the admin token this page was opened with.
  const socket = useOptionalSocket();
  const [packList, setPackList] = useState<{ id: string; name: string }[]>([]);
  const [pack, setPack] = useState<SandboxPack | null>(null);
  const [packMessage, setPackMessage] = useState<string | null>(null);
  // The latest selection, for the pack's async reply.
  const selection = useRef({ modeIdx, tile, doubleJeopardy });
  selection.current = { modeIdx, tile, doubleJeopardy };
  useEffect(() => {
    if (!socket) return;
    const handleList = (data: { packs: { id: string; name: string }[] }) => setPackList(data.packs);
    const handlePack = (data: { ok: boolean; reason?: string; pack?: SandboxPack }) => {
      if (!data.ok || !data.pack) {
        setPackMessage(data.reason ?? "Couldn't load that pack.");
        return;
      }
      const loaded = data.pack;
      setPack(loaded);
      setPackMessage(null);
      const sel = selection.current;
      // A board-level entry stays; a tile restarts with the pack's question.
      setRound((r) => r + 1);
      setGameState((prev) => place(freshBase(prev.teams.length, loaded), sel.modeIdx, sel.tile, sel.doubleJeopardy));
      setFullGame((prev) => freshFullGame(prev.teams.length, loaded, prev.theme ?? "original"));
    };
    socket.on("packList", handleList);
    socket.on("sandboxPackResult", handlePack);
    socket.emit("listPacks");
    return () => {
      socket.off("packList", handleList);
      socket.off("sandboxPackResult", handlePack);
    };
  }, [socket]);

  const choosePack = (id: string) => {
    if (!id) {
      setPack(null);
      setPackMessage(null);
      // The side game belongs to the pack.
      const nextMode = modeIdx === SIDE_MODE ? 0 : modeIdx;
      setModeIdx(nextMode);
      setRound((r) => r + 1);
      setGameState((prev) => place(freshBase(prev.teams.length, null), nextMode, tile, doubleJeopardy));
      restartFullGame(teamCount, null);
      return;
    }
    setPackMessage("Loading…");
    socket?.emit("sandboxPack", { adminToken: readStoredToken(), packId: id });
  };
  const hasSideGame = !!pack?.board.some((page) => page.sideGame === "charades");

  // Title screen entry: the lobby, then Start Game plays the tunnel into the
  // board (on the TV panel), with the pack's decor.
  const [titleStarted, setTitleStarted] = useState(false);
  const [tunnel, setTunnel] = useState(0);
  const [leavingTitle, setLeavingTitle] = useState(false);
  useEffect(() => {
    if (!leavingTitle) return;
    const timer = setTimeout(() => setLeavingTitle(false), TUNNEL_MS);
    return () => clearTimeout(timer);
  }, [leavingTitle]);
  const decor = pack?.titleScreen?.decor;
  const titleState: GameState = {
    ...gameState,
    started: false,
    titleScreen: {
      title: pack?.titleScreen?.title ?? "Game Show Jeopardy",
      ...(pack?.titleScreen?.subtitle ? { subtitle: pack.titleScreen.subtitle } : {}),
      ...(decor ? { decor } : {}),
    },
  };
  const startFromTitle = () => {
    setTitleStarted(true);
    setLeavingTitle(true);
    setTunnel((n) => n + 1);
    playSound(gameStartAudio);
  };

  // The full game run-through's own state (separate from the tile tester's).
  const [fullGame, setFullGame] = useState<GameState>(() => freshFullGame(MIN_TEAMS, null, "original"));
  const fullMode = modeIdx === FULL_MODE;
  const restartFullGame = (teams = teamCount, withContent: SandboxPack | null = pack) =>
    setFullGame(freshFullGame(teams, withContent, theme));

  const sideMode = modeIdx === SIDE_MODE;
  const titleMode = modeIdx === TITLE_MODE;
  const mode = MODES[modeIdx] ?? CHARADES_MODE;
  // The game actually playing (a pack tile can play as another game).
  const played = MODES.find((m) => m.name === gameState.currentGame.gameName) ?? mode;
  const Game = played.Component;
  const questionState = gameState.currentGame.questionState;
  const promptVisible = questionState.promptVisible;

  const start = (next: {
    modeIdx?: number;
    tile?: number;
    doubleJeopardy?: boolean;
    teamCount?: number;
  }) => {
    const nextMode = next.modeIdx ?? modeIdx;
    const nextTile = next.tile ?? tile;
    const nextDj = next.doubleJeopardy ?? doubleJeopardy;
    const nextTeams = next.teamCount ?? teamCount;
    setModeIdx(nextMode);
    setTile(nextTile);
    setDoubleJeopardy(nextDj);
    setTeamCount(nextTeams);
    setRound((r) => r + 1);
    if (nextMode === TITLE_MODE) setTitleStarted(false);
    if (nextMode === FULL_MODE) restartFullGame(nextTeams);
    setGameState((prev) =>
      place(nextTeams !== prev.teams.length ? freshBase(nextTeams, pack) : prev, nextMode, nextTile, nextDj)
    );
  };

  const reshuffleContent = () => {
    setRound((r) => r + 1);
    setGameState((prev) =>
      place({ ...prev, gameData: withPack(buildSandboxGameData(), pack) }, modeIdx, tile, doubleJeopardy)
    );
  };

  const resetScores = () => {
    setRound((r) => r + 1);
    setGameState((prev) =>
      place(
        {
          ...prev,
          teams: prev.teams.map((team) => ({ ...team, score: 0 })),
          answered: {},
          doubleJeopardyAnswered: {},
          sideCharades: undefined,
        },
        modeIdx,
        tile,
        doubleJeopardy
      )
    );
  };

  const handleAddPoints = (
    teamId: string,
    points: number,
    gameName: GameName,
    noPoints: boolean
  ) => setGameState((prev) => awardPoints(prev, teamId, points, gameName, noPoints));

  const handleUpdateTurn = (teamId: string) => setGameState((prev) => ({ ...prev, whoseTurn: teamId }));

  const revealToTv = () => setGameState((prev) => updateQuestionState(prev, { promptVisible: true }));

  const gameProps = { gameState, sendGameStateToServer: setGameState };
  const slotKey = doubleJeopardy ? gameState.currentGame.value / 2 + 1 : gameState.currentGame.value;
  const hasQuestion =
    modeIdx < 0 ||
    !!getCurrentQuestion((gameState.gameData[played.bank] ?? {}) as Record<string, unknown>, gameState);
  // One line for the bar: the content and what's on screen.
  const contentName = pack?.name ?? "Sample content";
  const columnTitle =
    pack?.board.flatMap((page) => page.columns).find((c) => c.game === mode.name)?.title ?? getGameTitle(mode.name);
  const tileValue = doubleJeopardy ? tile * 2 : tile;
  const nowShowing = fullMode
    ? `${contentName} · the full game, on the real host page and TV`
    : titleMode
    ? `${contentName} · the title screen and Start Game`
    : sideMode
    ? `${contentName} · the Reverse Charades tab`
    : `${contentName} · ${columnTitle} $${tileValue}${doubleJeopardy ? " (Double Jeopardy)" : ""}` +
      (played.name !== mode.name ? ` → plays as ${getGameTitle(played.name)}` : "");
  const howTo = fullMode
    ? "The whole game as the real host page and TV run it: start from the title screen, pick tiles on the board, award points, use the tabs, pause, end the game. Restart round starts it over. Nothing is sent to a server."
    : sideMode
    ? "The pack's Reverse Charades tab: start a team's turn, tap Got it / Skip, End turn; totals carry over across rounds. Time turns with Toggle Timer."
    : titleMode
    ? "The lobby as the TV shows it (the pack's title, decor and join code setting). Start Game plays the tunnel into the board and the start sound."
    : played.howTo;

  const hostPane = fullMode ? (
    <section className="rounded-xl bg-gray-50 p-3 text-left text-gray-900 shadow sm:p-4">
      <h2 className="mb-3 text-lg font-bold">Host panel</h2>
      {/* The real host page, laid out at laptop width and scaled to the
          panel; its toolbar and dialogs stay inside the panel. */}
      <VirtualScreen width={1280} height="auto">
        <div className="relative min-h-[720px] bg-gray-100">
          <AdminHost
            code="DEMO"
            gameState={fullGame}
            sendGameStateToServer={setFullGame}
            onReset={() => restartFullGame(fullGame.teams.length)}
          />
        </div>
      </VirtualScreen>
    </section>
  ) : (
    <section className="rounded-xl bg-gray-50 p-3 text-left text-gray-900 shadow sm:p-4">
      <h2 className="mb-3 text-lg font-bold">Host panel</h2>
      {/* Scaled as one piece to the panel's width, like the TV panel: laid
          out at a laptop-ish 900px, so text grows on a wide panel and shrinks
          on a narrow one. */}
      <VirtualScreen width={900} height="auto">
        {titleMode ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startFromTitle}
                className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
              >
                ▶ Start Game
              </button>
              {titleStarted && (
                <button
                  type="button"
                  onClick={() => setTitleStarted(false)}
                  className="rounded bg-gray-200 px-3 py-1 text-gray-800 hover:bg-gray-300"
                >
                  ↺ Back to title
                </button>
              )}
            </div>
            <p className="text-sm text-gray-600">The host's lobby (what the TV shows is on the right):</p>
            <div className="overflow-hidden rounded bg-gradient-to-b from-ink to-deep">
              <TitlePage isAdmin code="ABCD" gameState={titleState} sendGameStateToServer={startFromTitle} />
            </div>
          </div>
        ) : sideMode ? (
          <SideCharades isAdmin gameState={gameState} sendGameStateToServer={setGameState} />
        ) : !promptVisible ? (
          <button
            type="button"
            onClick={revealToTv}
            className="rounded bg-blue-500 p-2 text-white hover:bg-blue-600"
          >
            Next (reveal to TV)
          </button>
        ) : (
          <>
            <div className="rounded bg-white p-3 shadow-lg">
              <Game key={`host-${round}`} isAdmin={true} {...gameProps} />
            </div>
            <div className="mt-3">
              <AdminPointsButtons gameState={gameState} handleAddPoints={handleAddPoints} />
            </div>
          </>
        )}

        {/* The host toolbar's timer buttons. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <TimerControls gameState={gameState} sendGameStateToServer={setGameState} />
        </div>

        {/* The real board's "Set Turn" buttons only show on the board itself. */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Whose turn:</span>
          {gameState.teams.map((team, index) => (
            <button
              key={team.id}
              type="button"
              onClick={() => handleUpdateTurn(team.id)}
              className={`rounded px-3 py-1 text-sm text-white ${teamColor(index).chip} ${
                gameState.whoseTurn === team.id ? "ring-2 ring-offset-2 ring-gray-800" : "opacity-70"
              }`}
            >
              {team.name}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <ScoreBoard isAdmin={true} gameState={gameState} handleUpdateTurn={handleUpdateTurn} />
        </div>
        {promptVisible && modeIdx >= 0 && (
          <NoPointsButton gameState={gameState} handleAddPoints={handleAddPoints} />
        )}
      </VirtualScreen>
    </section>
  );

  const tvPane = fullMode ? (
    <section aria-label="TV display" className="rounded-xl bg-gradient-to-b from-ink to-deep p-2 text-white shadow sm:p-4">
      <h2 className="mb-2 text-left text-sm font-semibold uppercase tracking-widest text-white/60">TV display</h2>
      <VirtualScreen>
        <DisplayScreen code="DEMO" gameState={fullGame} />
      </VirtualScreen>
    </section>
  ) : (
    <section
      aria-label="TV display"
      className="rounded-xl bg-gradient-to-b from-ink to-deep p-2 text-white shadow sm:p-4"
    >
      <h2 className="mb-2 text-left text-sm font-semibold uppercase tracking-widest text-white/60">
        TV display
      </h2>
      {/* A scaled-down 1080p TV laid out like the real one (PageWrapper:
          question area fitted above the scoreboard), so everything grows and
          shrinks with the panel and it previews whether a game fits. */}
      <VirtualScreen>
        {titleMode ? (
          // The lobby, then the tunnel and board zoom, as on the real TV.
          <div className="relative h-full overflow-hidden">
            {titleStarted ? (
              <div key={tunnel} className={`h-full p-4 ${BOARD_ZOOM_CLASS}`}>
                <GameBoard
                  isAdmin={false}
                  introKey={tunnel}
                  gameState={gameState}
                  gameBoardData={boardData(gameState)}
                  handleUpdateCurrentGame={() => {}}
                  sendGameStateToServer={() => {}}
                />
              </div>
            ) : (
              <TitlePage isAdmin={false} code="ABCD" gameState={titleState} sendGameStateToServer={() => {}} />
            )}
            {titleStarted && leavingTitle && (
              <div key={`exit-${tunnel}`} className={TITLE_EXIT_CLASS}>
                <TitlePage isAdmin={false} code="ABCD" gameState={titleState} sendGameStateToServer={() => {}} />
              </div>
            )}
            <StartTunnel tunnelKey={tunnel} decor={decor} />
          </div>
        ) : (
        <div className="flex h-full flex-col gap-2 p-4">
          <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Toggle Timer, as on the real TV: a corner box, or the whole
                area with the question hidden. */}
            {gameState.showTimer && (
              <Timer
                contained
                playing={gameState.timerPlaying ?? false}
                restartToken={gameState.timerRestart ?? 0}
                fullScreen={!!gameState.timerFullScreen}
              />
            )}
            <div className={gameState.showTimer && gameState.timerFullScreen ? "hidden" : "contents"}>
              {/* Always fitted here: the screen is TV-sized at any window width. */}
              <FitToScreen media="all">
                {sideMode ? (
                  <SideCharades isAdmin={false} gameState={gameState} sendGameStateToServer={() => {}} />
                ) : (
                  <QuestionWrapper
                    gameState={gameState}
                    question={<Game key={`tv-${round}`} isAdmin={false} {...gameProps} />}
                  />
                )}
              </FitToScreen>
            </div>
          </div>
          {/* The side game shows its own totals instead. */}
          {!sideMode && (
            <div className="shrink-0">
              <ScoreBoard isAdmin={false} gameState={gameState} />
            </div>
          )}
        </div>
        )}
      </VirtualScreen>
      <NoPointsFlash count={gameState.noPointsCount ?? 0} />
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-3 text-left text-gray-900 sm:p-6">
      <header className="mx-auto">
        {/* One compact bar: what to show (content, game, tile), the setup
            that applies to every view (teams, theme), the actions that fit
            what's on screen, and the panel layout. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white px-3 py-2 text-sm shadow">
          <span className="font-bold">Sandbox</span>
          {/* Shown when the server lists packs (it doesn't without one). */}
          {packList.length > 0 && (
            <label className="flex items-center gap-1" title="Sample questions, or one of your content packs (loaded from the server)">
              <span className="text-xs text-gray-500">Content</span>
              <select
                aria-label="Content"
                value={pack?.id ?? ""}
                onChange={(e) => choosePack(e.target.value)}
                className="rounded border px-1 py-1"
              >
                <option value="">Sample content</option>
                {packList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {packMessage && <span className="text-xs text-gray-500">{packMessage}</span>}
            </label>
          )}
          <label className="flex items-center gap-1" title="A whole game, a screen, or one game to test tile by tile">
            <span className="text-xs text-gray-500">Show</span>
            <select
              aria-label="Game mode"
              value={modeIdx}
              onChange={(e) => start({ modeIdx: Number(e.target.value) })}
              className="rounded border px-1 py-1"
            >
              <optgroup label="Screens">
                <option value={FULL_MODE}>Full game (title → board → tiles)</option>
                <option value={TITLE_MODE}>Title screen (Start Game)</option>
                {hasSideGame && <option value={SIDE_MODE}>Reverse Charades tab (side game)</option>}
              </optgroup>
              {(["party", "original"] as const).map((group) => (
                <optgroup key={group} label={group === "party" ? "Party games, one tile" : "Original games, one tile"}>
                  {MODES.map((m, i) =>
                    m.group === group ? (
                      <option key={m.name} value={i}>
                        {getGameTitle(m.name)}
                      </option>
                    ) : null
                  )}
                </optgroup>
              ))}
            </select>
          </label>

          {/* Only when testing a single tile. */}
          {modeIdx >= 0 && (
            <>
              <label className="flex items-center gap-1" title="Which tile of the column to play">
                <span className="text-xs text-gray-500">Tile</span>
                <select
                  aria-label="Tile value"
                  value={tile}
                  onChange={(e) => start({ tile: Number(e.target.value) })}
                  className="rounded border px-1 py-1"
                >
                  {TILE_VALUES.map((v) => (
                    <option key={v} value={v}>
                      ${doubleJeopardy ? v * 2 : v}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-1" title="Double Jeopardy: doubles the points and uses the round 2 question">
                <input
                  type="checkbox"
                  aria-label="Double Jeopardy"
                  checked={doubleJeopardy}
                  onChange={(e) => start({ doubleJeopardy: e.target.checked })}
                />
                <span>Double Jeopardy</span>
              </label>
            </>
          )}

          <span className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />
          <label className="flex items-center gap-1" title="Number of teams (restarts what's on screen)">
            <span className="text-xs text-gray-500">Teams</span>
            <select
              aria-label="Team count"
              value={teamCount}
              onChange={(e) => start({ teamCount: Number(e.target.value) })}
              className="rounded border px-1 py-1"
            >
              {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1" title="Board colors">
            <span className="text-xs text-gray-500">Theme</span>
            <select
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              className="rounded border px-1 py-1"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <span className="hidden h-5 w-px bg-gray-200 sm:block" aria-hidden="true" />
          {/* Actions for what's on screen. */}
          <div className="flex flex-wrap gap-1" role="group" aria-label="Actions">
            <button
              type="button"
              onClick={() => start({})}
              title={
                fullMode
                  ? "Start the whole game over from the title screen"
                  : modeIdx < 0
                  ? "Start this screen over"
                  : "Replay this tile with a fresh state"
              }
              className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
            >
              ↺ {fullMode ? "Restart game" : modeIdx < 0 ? "Restart" : "Restart tile"}
            </button>
            {modeIdx >= 0 && (
              <>
                <button
                  type="button"
                  onClick={reshuffleContent}
                  title={pack ? "New sample questions for tiles the pack doesn't fill" : "Shuffle in different sample questions"}
                  className="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
                >
                  🔀 Reshuffle content
                </button>
                <button
                  type="button"
                  onClick={resetScores}
                  title="Set every team back to 0"
                  className="rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
                >
                  Reset scores
                </button>
              </>
            )}
          </div>

          <div className="ml-auto flex overflow-hidden rounded border" role="group" aria-label="View">
            {(["both", "host", "tv"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                aria-label={v === "both" ? "Both" : v === "host" ? "Host only" : "TV only"}
                title={v === "both" ? "Host panel and TV side by side" : v === "host" ? "Only the host panel" : "Only the TV"}
                className={`px-2 py-1 ${view === v ? "bg-gray-800 text-white" : "bg-white hover:bg-gray-100"}`}
              >
                {v === "both" ? "Both" : v === "host" ? "Host" : "TV"}
              </button>
            ))}
          </div>
        </div>

        {/* What's on screen, in one line; the rules fold away. */}
        <details className="mt-1 px-1 text-sm text-gray-700">
          <summary className="cursor-pointer select-none">
            <span className="font-semibold">Now:</span> {nowShowing}{" "}
            <span className="text-xs text-blue-600">ⓘ how to run it</span>
          </summary>
          <p className="mt-1 text-gray-600">{howTo}</p>
        </details>
        {!hasQuestion && (
          <p role="alert" className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800">
            No question in slot {slotKey} for this game. The bank is short for this tile.
          </p>
        )}
      </header>

      {/* Side by side at xl+, split by a draggable divider (stacked below). */}
      <main
        ref={mainRef}
        className={`mx-auto mt-4 grid gap-4 ${
          view === "both"
            ? "xl:grid-cols-[minmax(0,var(--host))_auto_minmax(0,var(--tv))] xl:gap-x-1"
            : "grid-cols-1"
        }`}
        style={{ "--host": `${hostShare}fr`, "--tv": `${100 - hostShare}fr` } as React.CSSProperties}
      >
        {view !== "tv" && hostPane}
        {view === "both" && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize host and TV panels"
            aria-valuemin={20}
            aria-valuemax={80}
            aria-valuenow={Math.round(hostShare)}
            tabIndex={0}
            title="Drag to resize; double-click to reset"
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDoubleClick={() => setHostShare(50)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setHostShare((s) => clampShare(s - 2));
              if (e.key === "ArrowRight") setHostShare((s) => clampShare(s + 2));
            }}
            className="group hidden w-3 cursor-col-resize items-center justify-center xl:flex"
          >
            <span
              className={`h-16 w-1.5 rounded-full transition-colors ${
                dragging ? "bg-blue-500" : "bg-gray-300 group-hover:bg-gray-500 group-focus:bg-blue-500"
              }`}
            />
          </div>
        )}
        {view !== "host" && tvPane}
      </main>
      {/* While dragging, a full-window layer takes the pointer so the
          YouTube iframes under it can't swallow the moves. */}
      {dragging && (
        <div
          data-testid="resize-layer"
          className="fixed inset-0 z-50 cursor-col-resize"
          onPointerMove={(e) => dragTo(e.clientX)}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        />
      )}

      <footer className="mx-auto mt-4">
        <button
          type="button"
          onClick={() => setShowState((s) => !s)}
          className="text-sm text-blue-700 underline"
        >
          {showState ? "Hide" : "Show"} game state
        </button>
        {showState && (
          <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-200">
            {JSON.stringify(
              {
                slot: slotKey,
                whoseTurn: gameState.whoseTurn,
                scores: gameState.teams.map((t) => `${t.name}: ${t.score}`),
                questionState,
              },
              null,
              2
            )}
          </pre>
        )}
      </footer>
    </div>
  );
};

export default Sandbox;
