import {
  CharadesQuestionState,
  ClockState,
  ClosestQuestionState,
  ClosestRule,
  FamilyFeudQuestionState,
  GameName,
  GameState,
  HeadToHeadQuestionState,
  MillionaireQuestionState,
  MinuteQuestionState,
  OrderQuestionState,
  PerformQuestionState,
  QuestionState,
  ScavengerQuestionState,
  TeamState,
  WheelQuestionState,
} from "./types";

// Pure logic for the party games (ROADMAP Tier 5), kept out of the components
// so it can be unit-tested without rendering anything.

export const DEFAULT_CLOCK_SECONDS = 60;

export function createClock(seconds: number): ClockState {
  const durationMs = Math.max(1, Math.round(seconds)) * 1000;
  return { durationMs, remainingMs: durationMs, running: false, runId: 0 };
}

// Host-set clock length. Bounded so a typo can't make a zero or hour-long clock.
export const MIN_CLOCK_SECONDS = 5;
export const MAX_CLOCK_SECONDS = 600;

// The same clock, reset and paused at a new length. `runId` bumps so both
// screens pick up the change.
export function setClockSeconds(clock: ClockState, seconds: number): ClockState {
  const bounded = Math.min(MAX_CLOCK_SECONDS, Math.max(MIN_CLOCK_SECONDS, Math.round(seconds)));
  const durationMs = bounded * 1000;
  return { durationMs, remainingMs: durationMs, running: false, runId: clock.runId + 1 };
}

// The clock started from its current time left.
export function startClock(clock: ClockState): ClockState {
  return { ...clock, running: true, runId: clock.runId + 1 };
}

// ---- Immutable state updates ------------------------------------------------

// Returns a new GameState with `patch` merged into the current question's
// state, without mutating the old one (unlike the older game components).
export function updateQuestionState<T extends QuestionState>(
  gameState: GameState,
  patch: Partial<T>
): GameState {
  return {
    ...gameState,
    currentGame: {
      ...gameState.currentGame,
      questionState: { ...gameState.currentGame.questionState, ...patch },
    },
  };
}

// The team after `currentId` in seat order, wrapping around. Falls back to the
// first team when there's no current team yet.
export function nextTeamId(teams: TeamState[], currentId?: string): string {
  const index = teams.findIndex((team) => team.id === currentId);
  return teams[(index + 1) % teams.length].id;
}

// ---- Shuffle that host and TV can agree on ---------------------------------

// mulberry32: small seeded PRNG, so two screens given the same seed produce
// the same shuffle without sending the shuffled order itself.
function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const result = [...items];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// A shuffle that is never already the solved order (a "puzzle" that arrives
// solved would be embarrassing). Assumes items are unique.
export function scrambledOrder<T>(items: readonly T[], seed: number): T[] {
  const shuffled = seededShuffle(items, seed);
  const alreadySolved = shuffled.every((item, i) => item === items[i]);
  if (alreadySolved && shuffled.length > 1) {
    [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]];
  }
  return shuffled;
}

// ---- Wheel Puzzle -----------------------------------------------------------

export const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const isLetter = (char: string) => /^[A-Z]$/.test(char);

export function phraseHasLetter(phrase: string, letter: string): boolean {
  return phrase.toUpperCase().includes(letter.toUpperCase());
}

export function isPhraseComplete(phrase: string, guessed: string[]): boolean {
  return phrase
    .toUpperCase()
    .split("")
    .every((char) => !isLetter(char) || guessed.includes(char));
}

// How many letter tiles are currently showing (used to tell a hit from a miss).
export function countRevealedLetters(phrase: string, guessed: string[]): number {
  return phrase
    .toUpperCase()
    .split("")
    .filter((char) => isLetter(char) && guessed.includes(char)).length;
}

export interface WheelTile {
  char: string;
  isLetter: boolean;
  show: boolean;
}

// The board as words (so a phrase wraps between words, never mid-word), each a
// list of tiles. Punctuation always shows; letters show once guessed or solved.
export function wheelWords(phrase: string, guessed: string[], solved: boolean): WheelTile[][] {
  return phrase
    .toUpperCase()
    .split(" ")
    .filter((word) => word.length > 0)
    .map((word) =>
      word.split("").map((char) => {
        const letter = isLetter(char);
        return { char, isLetter: letter, show: !letter || solved || guessed.includes(char) };
      })
    );
}

// ---- Closest Wins -----------------------------------------------------------

export interface ClosestResult {
  winners: string[];
  // teamId -> |guess - answer|, or null if that team has no guess.
  distances: Record<string, number | null>;
  // False for no guess, or for a guess that went over under "noOver".
  eligible: Record<string, boolean>;
}

export function computeClosestResult(
  answer: number,
  guesses: Record<string, number | null>,
  rule: ClosestRule = "closest"
): ClosestResult {
  const ids = Object.keys(guesses);
  const distances: Record<string, number | null> = {};
  const eligible: Record<string, boolean> = {};
  let best = Infinity;

  ids.forEach((id) => {
    const guess = guesses[id];
    if (guess === null || guess === undefined || !Number.isFinite(guess)) {
      distances[id] = null;
      eligible[id] = false;
      return;
    }
    const distance = Math.abs(guess - answer);
    const ok = rule === "noOver" ? guess <= answer : true;
    distances[id] = distance;
    eligible[id] = ok;
    if (ok && distance < best) best = distance;
  });

  // Ties all win; nobody wins if no guess is eligible.
  const winners = ids.filter((id) => eligible[id] && distances[id] === best);
  return { winners, distances, eligible };
}

// ---- Reverse Charades -------------------------------------------------------

// The word at `index`, wrapping so a long game never runs off the list.
export function charadesWord(words: readonly string[], index: number): string {
  if (words.length === 0) return "";
  return words[((index % words.length) + words.length) % words.length];
}

// ---- Scoring helpers --------------------------------------------------------

// Team(s) with the highest count; nobody if no one scored.
export function bestTeams(counts: Record<string, number | null>): string[] {
  const entries = Object.entries(counts).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number"
  );
  if (entries.length === 0) return [];
  const max = Math.max(...entries.map(([, count]) => count));
  if (max <= 0) return [];
  return entries.filter(([, count]) => count === max).map(([id]) => id);
}

// ---- Initial state per game -------------------------------------------------

// The fresh `questionState` when a tile for `gameName` is picked. `question`
// only matters for the timed games, whose bank entries can override the
// default clock length. Covers every tile game: the four original ones mirror
// what Admin.handleUpdateCurrentGame builds today (so Admin can adopt this
// later, ROADMAP I3), plus the party games.
export function createInitialQuestionState(
  gameName: GameName,
  teams: TeamState[],
  question?: { seconds?: number }
): QuestionState {
  const nullPerTeam = () =>
    Object.fromEntries(teams.map((team) => [team.id, null])) as Record<string, number | null>;
  const clock = () => createClock(question?.seconds ?? DEFAULT_CLOCK_SECONDS);

  // Each state is built as its specific type so its fields are checked.
  switch (gameName) {
    case GameName.FAMILY_FEUD: {
      const state: FamilyFeudQuestionState = {
        promptVisible: false,
        showFeudPrompt: false,
        revealedAnswers: [],
        wrongGuesses: 0,
      };
      return state;
    }
    case GameName.MINUTE: {
      const state: MinuteQuestionState = { promptVisible: false };
      return state;
    }
    case GameName.HEAD_TO_HEAD: {
      const state: HeadToHeadQuestionState = { promptVisible: false, showTitle: false };
      return state;
    }
    case GameName.MILLIONAIRE: {
      const state: MillionaireQuestionState = {
        promptVisible: false,
        questionIdx: 0,
        revealedAnswers: 0,
      };
      return state;
    }
    case GameName.WHEEL: {
      const state: WheelQuestionState = {
        promptVisible: false,
        guessedLetters: [],
        solved: false,
        wrongGuesses: 0,
      };
      return state;
    }
    case GameName.ACT: {
      const state: PerformQuestionState = { promptVisible: false, clock: clock(), wordRevealed: false };
      return state;
    }
    case GameName.SCAVENGER: {
      const state: ScavengerQuestionState = { promptVisible: false, clock: clock(), itemRevealed: false };
      return state;
    }
    case GameName.CLOSEST: {
      const state: ClosestQuestionState = { promptVisible: false, guesses: nullPerTeam(), revealed: false };
      return state;
    }
    case GameName.ORDER: {
      const state: OrderQuestionState = {
        promptVisible: false,
        seed: Math.floor(Math.random() * 2147483647),
        revealedCount: 0,
      };
      return state;
    }
    case GameName.CHARADES: {
      const state: CharadesQuestionState = {
        promptVisible: false,
        clock: clock(),
        activeTeamId: null,
        wordIndex: 0,
        scores: nullPerTeam(),
      };
      return state;
    }
    default:
      return { promptVisible: false };
  }
}
