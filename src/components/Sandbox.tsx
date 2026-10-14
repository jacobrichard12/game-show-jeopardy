import React, { useRef, useState } from "react";
// Filler content only (ROADMAP S2): whatever this page imports ships in the
// public JS bundle, so real questions must never be imported here (see
// sandboxContent.ts).
import { createInitialQuestionState, updateQuestionState } from "../shared/partyGames";
import { awardPoints } from "../shared/scoring";
import { teamColor } from "../shared/teamColors";
import { ThemeId, THEMES } from "../shared/themes";
import {
  GameName,
  GameState,
  getCurrentQuestion,
  getGameTitle,
  MAX_TEAMS,
  MIN_TEAMS,
  QuestionProps,
} from "../shared/types";
import { tileGame } from "../shared/boardLayout";
import ActDrawDescribe from "./ActDrawDescribe";
import AdminPointsButtons, { NoPointsButton } from "./AddPointsButtons";
import ClosestWins from "./ClosestWins";
import FamilyFeud from "./FamilyFeud";
import FitToScreen from "./FitToScreen";
import NoPointsFlash from "./NoPointsFlash";
import SideCharades from "./SideCharades";
import { useSandboxPacks } from "./useSandboxPacks";
import { buildSandboxGameData, freshBase, newSandboxState, withPack } from "./sandboxContent";
import Timer from "./Timer";
import DeviceFrame, { DeviceSize, DeviceSizePicker } from "./DeviceFrame";
import SplitPanes, { PaneView, PaneViewSwitch } from "./SplitPanes";
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

// The Game dropdown's special entry: a pack's Reverse Charades side game.
const SIDE_MODE = -1;
const CHARADES_MODE = MODES.find((m) => m.name === GameName.CHARADES)!;

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

type View = PaneView;

const Sandbox: React.FC = () => {
  // Previews a board theme on the TV panel (real games pick one at creation).
  const [theme, setTheme] = useState<ThemeId>("original");
  useTheme(theme);
  const [modeIdx, setModeIdx] = useState(0);
  const [tile, setTile] = useState(100);
  const [doubleJeopardy, setDoubleJeopardy] = useState(false);
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  const [view, setView] = useState<View>("both");
  // Each panel previews a device size (DeviceFrame): the host follows the
  // panel's width (narrow = phone layout); the TV is a 1080p screen.
  const [hostSize, setHostSize] = useState<DeviceSize>("actual");
  const [tvSize, setTvSize] = useState<DeviceSize>("tv");
  const hostHeading = (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-lg font-bold">Host panel</h2>
      <DeviceSizePicker label="Host size" value={hostSize} onChange={setHostSize} />
    </div>
  );
  const tvHeading = (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h2 className="text-left text-sm font-semibold uppercase tracking-widest text-white/60">TV display</h2>
      <DeviceSizePicker label="TV size" value={tvSize} onChange={setTvSize} dark />
    </div>
  );
  const [showState, setShowState] = useState(false);
  // Bumped whenever a round (re)starts so game components remount and drop
  // any local input state (e.g. half-typed guesses).
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState<GameState>(() =>
    buildRound(newSandboxState(MIN_TEAMS), MODES[0], 100, false)
  );

  // Content: the bundled samples, or a content pack loaded from the server
  // behind the admin token this page was opened with.
  // The latest selection, for the pack's async reply.
  const selection = useRef({ modeIdx, tile, doubleJeopardy });
  selection.current = { modeIdx, tile, doubleJeopardy };
  const { packList, pack, message: packMessage, choosePack } = useSandboxPacks((loaded) => {
    const sel = selection.current;
    // The side game belongs to a pack.
    const nextMode = !loaded && sel.modeIdx === SIDE_MODE ? 0 : sel.modeIdx;
    setModeIdx(nextMode);
    setRound((r) => r + 1);
    setGameState((prev) => place(freshBase(prev.teams.length, loaded), nextMode, sel.tile, sel.doubleJeopardy));
  });
  const hasSideGame = !!pack?.board.some((page) => page.sideGame === "charades");

  const sideMode = modeIdx === SIDE_MODE;
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
  const nowShowing = sideMode
    ? `${contentName} · the Reverse Charades tab`
    : `${contentName} · ${columnTitle} $${tileValue}${doubleJeopardy ? " (Double Jeopardy)" : ""}` +
      (played.name !== mode.name ? ` → plays as ${getGameTitle(played.name)}` : "");
  const howTo = sideMode
    ? "The pack's Reverse Charades tab: start a team's turn, tap Got it / Skip, End turn; totals carry over across rounds. Time turns with Toggle Timer."
    : played.howTo;

  const hostPane = (
    <section className="rounded-xl bg-gray-50 p-3 text-left text-gray-900 shadow sm:p-4">
      {hostHeading}
      {/* A device-sized frame: at "Actual width" a narrow panel shows the
          phone layout. */}
      <DeviceFrame title="Host panel" size={hostSize}>
        <div className="bg-gray-50 p-3 text-gray-900">
        {sideMode ? (
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
        </div>
      </DeviceFrame>
    </section>
  );

  const tvPane = (
    <section
      aria-label="TV display"
      className="rounded-xl bg-gradient-to-b from-ink to-deep p-2 text-white shadow sm:p-4"
    >
      {tvHeading}
      {/* A device-sized TV laid out like the real one (PageWrapper: question
          area fitted above the scoreboard), so it previews whether a game
          fits. */}
      <DeviceFrame title="TV" size={tvSize} actualHeight="tv">
        <div className="h-full bg-gradient-to-b from-ink to-deep text-white">
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
        {/* Inside the frame, so it covers the TV, not the whole sandbox. */}
        <NoPointsFlash count={gameState.noPointsCount ?? 0} />
        </div>
      </DeviceFrame>
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
              title={modeIdx < 0 ? "Start this screen over" : "Replay this tile with a fresh state"}
              className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
            >
              ↺ {modeIdx < 0 ? "Restart" : "Restart tile"}
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

          <a href="/sandbox/demo" className="text-blue-600 underline" title="Play a whole game with a pack, on the real host page and TV">
            Whole game demo →
          </a>
          <PaneViewSwitch view={view} onChange={setView} />
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

      <SplitPanes view={view} host={hostPane} tv={tvPane} />

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
