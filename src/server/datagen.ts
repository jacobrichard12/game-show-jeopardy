import minuteBankJson from "../data/minuteBank.json";
import headToHeadBankJson from "../data/headToHeadBank.json";
import {
  Difficulty,
  FamilyFeudQuestions,
  GameData,
  HeadToHeadQuestions,
  MillionaireQuestions,
  MinuteQuestions
} from "../shared/types";
import { initFeudLibrary } from "./feud";
import { fetchTriviaQuestions } from "./trivia";

export async function initGameData(): Promise<GameData> {
  const minuteData = createMinuteQuestions();
  const headToHeadData = createHeadToHeadQuestions();
  const millionaireDataPromise = createMillionaireQuestions();
  const fuedDataPromise = createFeudQuestions();

  const millionaireData = await millionaireDataPromise;
  const feudData = await fuedDataPromise;
  const gameData: GameData = {
    feud: feudData,
    minute: minuteData,
    millionaire: millionaireData,
    head: headToHeadData,
  };

  return gameData;
}

export const DIFFICULTY_MAPPING = {
  [Difficulty.easy]: [100, 101, 200, 201],
  [Difficulty.medium]: [300, 301, 400, 401],
  [Difficulty.hard]: [500, 501],
};

export async function createFeudQuestions(): Promise<FamilyFeudQuestions> {
  const feudQuestions: FamilyFeudQuestions = {};

  const feudLibrary = await initFeudLibrary();

  Object.values(Difficulty).forEach((difficulty) => {
    DIFFICULTY_MAPPING[difficulty].forEach((value, idx) => {
      feudQuestions[value] = feudLibrary[difficulty][idx];
    });
  })
  console.log("Feud Questions")
  console.log(feudQuestions)
  return feudQuestions;
}

export async function createMillionaireQuestions(): Promise<MillionaireQuestions> {
  const millionaireQuestions: MillionaireQuestions = {};

  // Independent requests (different difficulty pools) — run concurrently
  // rather than awaiting one after the other.
  const [easyQuestions, mediumHardQuestions] = await Promise.all([
    fetchTriviaQuestions(12, Difficulty.easy),
    fetchTriviaQuestions(18, Difficulty.medium),
  ]);

  DIFFICULTY_MAPPING[Difficulty.easy].forEach((value, idx) => {
    millionaireQuestions[value] = {
      questions: [
        easyQuestions[idx * 3],
        easyQuestions[idx * 3 + 1],
        easyQuestions[idx * 3 + 2],
      ],
    };
  });
  [...DIFFICULTY_MAPPING[Difficulty.medium], ...DIFFICULTY_MAPPING[Difficulty.hard]].forEach((value, idx) => {
    millionaireQuestions[value] = {
      questions: [
        mediumHardQuestions[idx * 3],
        mediumHardQuestions[idx * 3 + 1],
        mediumHardQuestions[idx * 3 + 2],
      ],
    };
  });
  console.log("Millionaire Questions:")
  console.log(millionaireQuestions)
  return millionaireQuestions;
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
