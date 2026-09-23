import React, { useState } from "react";
import headToHeadBank from "../data/headToHeadBank.json";
import minuteBank from "../data/minuteBank.json";
import partyGames from "../data/partyGames.json";
import sandboxFeud from "../data/sandboxFeud.json";
import sandboxMillionaire from "../data/sandboxMillionaire.json";
import { createInitialQuestionState, updateQuestionState } from "../shared/partyGames";
import { awardPoints } from "../shared/scoring";
import { buildMillionaireQuestions, buildSlotBank, DifficultyBank, MillionairePool } from "../shared/slots";
import { teamColor } from "../shared/teamColors";
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
  ScavengerItem,
  WheelPuzzle as WheelPuzzleData,
} from "../shared/types";
import ActDrawDescribe from "./ActDrawDescribe";
import AdminPointsButtons, { NoPointsButton } from "./AddPointsButtons";
import ClosestWins from "./ClosestWins";
import FamilyFeud from "./FamilyFeud";
import FitToScreen from "./FitToScreen";
import HeadToHead from "./HeadToHead";
import Millionaire from "./Millionaire";
import Minute from "./Minute";
import PutInOrder from "./PutInOrder";
import QuestionWrapper from "./QuestionWrapper";
import ReverseCharades from "./ReverseCharades";
import ScavengerSprint from "./ScavengerSprint";
import ScoreBoard from "./Scoreboard";
import WheelPuzzle from "./WheelPuzzle";

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
      "Teams call letters in turn; tap each letter on the host panel. A miss passes the turn. If a team guesses the whole thing wrong, hit Wrong guess (big X on the TV, turn passes). Reveal puzzle plays a cheer. Then award the tile.",
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
      "Set whose turn it is; that team orders the list. Reveal the true order one at a time (ding each time), then award the tile or use No points.",
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

function newSandboxState(teamCount: number): GameState {
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
  const positioned: GameState = {
    ...base,
    isDoubleJeopardy: doubleJeopardy,
    currentGame: { ...base.currentGame, gameName: mode.name, value },
  };
  const question = getCurrentQuestion(
    (positioned.gameData[mode.bank] ?? {}) as unknown as Record<string, { seconds?: number }>,
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
      gameName: mode.name,
      gameTitle: getGameTitle(mode.name),
      value,
      questionState: createInitialQuestionState(mode.name, base.teams, question),
    },
  };
}

type View = "both" | "host" | "tv";

const Sandbox: React.FC = () => {
  const [modeIdx, setModeIdx] = useState(0);
  const [tile, setTile] = useState(100);
  const [doubleJeopardy, setDoubleJeopardy] = useState(false);
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  const [view, setView] = useState<View>("both");
  const [showState, setShowState] = useState(false);
  // Bumped whenever a round (re)starts so game components remount and drop
  // any local input state (e.g. half-typed guesses).
  const [round, setRound] = useState(0);
  const [gameState, setGameState] = useState<GameState>(() =>
    buildRound(newSandboxState(MIN_TEAMS), MODES[0], 100, false)
  );

  const mode = MODES[modeIdx];
  const Game = mode.Component;
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
      buildRound(
        nextTeams !== prev.teams.length ? newSandboxState(nextTeams) : prev,
        MODES[nextMode],
        nextTile,
        nextDj
      )
    );
  };

  const reshuffleContent = () => {
    setRound((r) => r + 1);
    setGameState((prev) =>
      buildRound({ ...prev, gameData: buildSandboxGameData() }, mode, tile, doubleJeopardy)
    );
  };

  const resetScores = () => {
    setRound((r) => r + 1);
    setGameState((prev) =>
      buildRound(
        {
          ...prev,
          teams: prev.teams.map((team) => ({ ...team, score: 0 })),
          answered: {},
          doubleJeopardyAnswered: {},
        },
        mode,
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
  const hasQuestion = !!(gameState.gameData[mode.bank] ?? {})[slotKey];

  const hostPane = (
    <section className="rounded-xl bg-gray-50 p-3 text-left text-gray-900 shadow sm:p-4">
      <h2 className="mb-3 text-lg font-bold">Host panel</h2>
      {!promptVisible ? (
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
      {promptVisible && (
        <NoPointsButton gameState={gameState} handleAddPoints={handleAddPoints} />
      )}
    </section>
  );

  const tvPane = (
    <section
      aria-label="TV display"
      className="rounded-xl bg-gradient-to-b from-ink to-indigo-950 p-2 text-white shadow sm:p-4"
    >
      <h2 className="mb-2 text-left text-sm font-semibold uppercase tracking-widest text-white/60">
        TV display
      </h2>
      {/* Shaped like the real TV's question area (a 16:9 screen minus the
          scoreboard, about 16:7) and fitted the same way, so it previews
          whether a game fits without scrolling. */}
      <div className="flex flex-col lg:aspect-[16/7]">
        <FitToScreen>
          <QuestionWrapper
            gameState={gameState}
            question={<Game key={`tv-${round}`} isAdmin={false} {...gameProps} />}
          />
        </FitToScreen>
      </div>
      <div className="mt-2">
        <ScoreBoard isAdmin={false} gameState={gameState} />
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-3 text-left text-gray-900 sm:p-6">
      <header className="mx-auto max-w-[1800px]">
        <h1 className="text-2xl font-bold">Game sandbox</h1>
        <p className="mb-3 text-sm text-gray-600">
          Runs locally, no server or room code. The host panel and TV share one game state.
        </p>

        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-3 shadow">
          <label className="text-sm">
            <span className="block text-gray-600">Game</span>
            <select
              aria-label="Game mode"
              value={modeIdx}
              onChange={(e) => start({ modeIdx: Number(e.target.value) })}
              className="rounded border p-2"
            >
              {(["party", "original"] as const).map((group) => (
                <optgroup key={group} label={group === "party" ? "Party games" : "Original games"}>
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
          <label className="text-sm">
            <span className="block text-gray-600">Tile</span>
            <select
              aria-label="Tile value"
              value={tile}
              onChange={(e) => start({ tile: Number(e.target.value) })}
              className="rounded border p-2"
            >
              {TILE_VALUES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              aria-label="Double Jeopardy"
              checked={doubleJeopardy}
              onChange={(e) => start({ doubleJeopardy: e.target.checked })}
            />
            Double Jeopardy (doubles points, uses the twin question)
          </label>
          <label className="text-sm">
            <span className="block text-gray-600">Teams</span>
            <select
              aria-label="Team count"
              value={teamCount}
              onChange={(e) => start({ teamCount: Number(e.target.value) })}
              className="rounded border p-2"
            >
              {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <button type="button" onClick={() => start({})} className="rounded bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-600">
            Restart round
          </button>
          <button type="button" onClick={reshuffleContent} className="rounded bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300">
            Reshuffle content
          </button>
          <button type="button" onClick={resetScores} className="rounded bg-gray-200 px-3 py-2 text-sm hover:bg-gray-300">
            Reset scores
          </button>

          <div className="ml-auto flex gap-1" role="group" aria-label="View">
            {(["both", "host", "tv"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`rounded px-3 py-2 text-sm ${
                  view === v ? "bg-gray-800 text-white" : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {v === "both" ? "Both" : v === "host" ? "Host only" : "TV only"}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-3 text-sm text-gray-700">
          <strong>How to run it:</strong> {mode.howTo}
        </p>
        {!hasQuestion && (
          <p role="alert" className="mt-2 rounded bg-red-100 p-2 text-sm text-red-800">
            No question in slot {slotKey} for this game. The bank is short for this tile.
          </p>
        )}
      </header>

      <main
        className={`mx-auto mt-4 grid max-w-[1800px] gap-4 ${
          view === "both" ? "xl:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {view !== "tv" && hostPane}
        {view !== "host" && tvPane}
      </main>

      <footer className="mx-auto mt-4 max-w-[1800px]">
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
