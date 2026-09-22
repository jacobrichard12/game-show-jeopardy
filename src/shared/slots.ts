import { Difficulty, MillionaireQuestions, MillionaireSubQuestion } from "./types";

// The board's slot scheme, shared by the server's content builders
// (server/datagen.ts) and the client-side sandbox so there is one definition.
// Question banks are keyed by these slot numbers; `x01` is the Double Jeopardy
// twin of `x00` (see getCurrentQuestion in types.ts).
export const DIFFICULTY_SLOTS: Record<Difficulty, number[]> = {
  [Difficulty.easy]: [100, 101, 200, 201],
  [Difficulty.medium]: [300, 301, 400, 401],
  [Difficulty.hard]: [500, 501],
};

export function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export type DifficultyBank<T> = Record<Difficulty, T[]>;

// Shuffles each difficulty's entries and assigns them to that difficulty's
// slots. A difficulty with fewer entries than slots simply leaves the extra
// slots empty (components render "no question available" for those tiles).
export function buildSlotBank<T>(source: DifficultyBank<T>): Record<string, T> {
  const bank: Record<string, T> = {};
  (Object.keys(DIFFICULTY_SLOTS) as Difficulty[]).forEach((difficulty) => {
    const items = shuffleArray(source[difficulty] ?? []);
    DIFFICULTY_SLOTS[difficulty].forEach((slot, idx) => {
      if (items[idx] !== undefined) bank[slot] = items[idx];
    });
  });
  return bank;
}

// Millionaire trivia comes from OpenTDB, which rate-limits to ~1 request per
// 5s per IP, so the server fetches one larger pool at startup and every room
// draws a reshuffled slice from it (see server/datagen.ts). The browser
// sandbox feeds the same builder from a bundled sample pool.
export interface MillionairePool {
  easy: MillionaireSubQuestion[];
  mediumHard: MillionaireSubQuestion[];
}

export function buildMillionaireQuestions(pool: MillionairePool): MillionaireQuestions {
  const millionaireQuestions: MillionaireQuestions = {};
  const easyQuestions = shuffleArray(pool.easy);
  const mediumHardQuestions = shuffleArray(pool.mediumHard);

  // Modulo-wrap rather than index straight off the end: if OpenTDB was down
  // at boot and the pool came back short, tiles reuse a question instead of
  // getting `undefined` sub-questions (Millionaire.tsx still guards against
  // an empty pool leaving no questions at all).
  const pick = (arr: MillionaireSubQuestion[], idx: number) =>
    arr.length === 0 ? undefined : arr[idx % arr.length];

  DIFFICULTY_SLOTS[Difficulty.easy].forEach((value, idx) => {
    millionaireQuestions[value] = {
      questions: [0, 1, 2]
        .map((i) => pick(easyQuestions, idx * 3 + i))
        .filter((q): q is MillionaireSubQuestion => q !== undefined),
    };
  });
  [...DIFFICULTY_SLOTS[Difficulty.medium], ...DIFFICULTY_SLOTS[Difficulty.hard]].forEach((value, idx) => {
    millionaireQuestions[value] = {
      questions: [0, 1, 2]
        .map((i) => pick(mediumHardQuestions, idx * 3 + i))
        .filter((q): q is MillionaireSubQuestion => q !== undefined),
    };
  });
  return millionaireQuestions;
}
