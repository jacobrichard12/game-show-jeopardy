import minuteBankJson from "../data/minuteBank.json";
import headToHeadBankJson from "../data/headToHeadBank.json";
import {
  Difficulty,
  FamilyFeudQuestions,
  GameData,
  HeadToHeadQuestions,
  MillionaireQuestions,
  MillionaireSubQuestion,
  MinuteQuestions
} from "../shared/types";
import { initFeudLibrary } from "./feud";
import { fetchTriviaQuestions } from "./trivia";

export const DIFFICULTY_MAPPING = {
  [Difficulty.easy]: [100, 101, 200, 201],
  [Difficulty.medium]: [300, 301, 400, 401],
  [Difficulty.hard]: [500, 501],
};

// Millionaire trivia comes from OpenTDB, which rate-limits to ~1 request per
// 5s per IP. Fetching it fresh per room would make "Create Game" take
// 10-30s. Instead we fetch one larger pool at server startup and have every
// room draw a reshuffled slice from it — room creation is then instant, and
// simultaneous rooms occasionally share a question, which is an acceptable
// trade for not depending on a rate-limited external call per game.
export interface MillionairePool {
  easy: MillionaireSubQuestion[];
  mediumHard: MillionaireSubQuestion[];
}

export async function fetchMillionairePool(): Promise<MillionairePool> {
  // Ask for the max (50) OpenTDB returns per query rather than only what one
  // room needs (12/18) — the same request cost, but the surplus is what lets
  // multiple rooms draw different-looking slices instead of identical ones.
  const [easy, mediumHard] = await Promise.all([
    fetchTriviaQuestions(50, Difficulty.easy),
    fetchTriviaQuestions(50, Difficulty.medium),
  ]);
  return { easy, mediumHard };
}

function buildMillionaireQuestions(pool: MillionairePool): MillionaireQuestions {
  const millionaireQuestions: MillionaireQuestions = {};
  const easyQuestions = shuffleArray(pool.easy);
  const mediumHardQuestions = shuffleArray(pool.mediumHard);

  // Modulo-wrap rather than index straight off the end: if OpenTDB was down
  // at boot and the pool came back short, tiles reuse a question instead of
  // getting `undefined` sub-questions (Millionaire.tsx still guards against
  // an empty pool leaving no questions at all).
  const pick = (arr: MillionaireSubQuestion[], idx: number) =>
    arr.length === 0 ? undefined : arr[idx % arr.length];

  DIFFICULTY_MAPPING[Difficulty.easy].forEach((value, idx) => {
    millionaireQuestions[value] = {
      questions: [0, 1, 2]
        .map((i) => pick(easyQuestions, idx * 3 + i))
        .filter((q): q is MillionaireSubQuestion => q !== undefined),
    };
  });
  [...DIFFICULTY_MAPPING[Difficulty.medium], ...DIFFICULTY_MAPPING[Difficulty.hard]].forEach((value, idx) => {
    millionaireQuestions[value] = {
      questions: [0, 1, 2]
        .map((i) => pick(mediumHardQuestions, idx * 3 + i))
        .filter((q): q is MillionaireSubQuestion => q !== undefined),
    };
  });
  return millionaireQuestions;
}

// Builds a fresh GameData for one room. Feud/Minute/Head-to-Head are all
// local data (CSV/JSON), so they're regenerated and reshuffled per room at
// no cost; only Millionaire draws from the shared pool above.
export async function createRoomGameData(millionairePool: MillionairePool): Promise<GameData> {
  const minuteData = createMinuteQuestions();
  const headToHeadData = createHeadToHeadQuestions();
  const feudData = await createFeudQuestions();
  const millionaireData = buildMillionaireQuestions(millionairePool);

  return {
    feud: feudData,
    minute: minuteData,
    millionaire: millionaireData,
    head: headToHeadData,
  };
}

export async function createFeudQuestions(): Promise<FamilyFeudQuestions> {
  const feudQuestions: FamilyFeudQuestions = {};

  const feudLibrary = await initFeudLibrary();

  Object.values(Difficulty).forEach((difficulty) => {
    DIFFICULTY_MAPPING[difficulty].forEach((value, idx) => {
      feudQuestions[value] = feudLibrary[difficulty][idx];
    });
  })
  return feudQuestions;
}

export function createMinuteQuestions(): MinuteQuestions {
  const minuteQuestions: MinuteQuestions = {};
  const shuffledQuestions = {
    [Difficulty.easy]: shuffleArray(minuteBankJson.easy),
    [Difficulty.medium]: shuffleArray(minuteBankJson.medium),
    [Difficulty.hard]: shuffleArray(minuteBankJson.hard),
  }
  Object.values(Difficulty).forEach((difficulty) => {
    DIFFICULTY_MAPPING[difficulty].forEach((value, idx) => {
      minuteQuestions[value] = shuffledQuestions[difficulty][idx];
    });
  });

  return minuteQuestions;
}

export function createHeadToHeadQuestions(): HeadToHeadQuestions {
  const headToHeadQuestions: HeadToHeadQuestions = {};
  const shuffledQuestions = {
    [Difficulty.easy]: shuffleArray(headToHeadBankJson.easy),
    [Difficulty.medium]: shuffleArray(headToHeadBankJson.medium),
    [Difficulty.hard]: shuffleArray(headToHeadBankJson.hard),
  }
  Object.values(Difficulty).forEach((difficulty) => {
    DIFFICULTY_MAPPING[difficulty].forEach((value, idx) => {
      headToHeadQuestions[value] = shuffledQuestions[difficulty][idx];
    });
  });

  return headToHeadQuestions;
}

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}
