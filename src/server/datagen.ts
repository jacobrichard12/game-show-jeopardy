import minuteBankJson from "../data/minuteBank.json";
import headToHeadBankJson from "../data/headToHeadBank.json";
import partyGamesJson from "../data/partyGames.json";
import {
  CharadesPrompt,
  ClosestQuestion,
  Difficulty,
  FamilyFeudQuestions,
  GameData,
  HeadToHeadQuestions,
  MinuteQuestions,
  OrderPuzzle,
  PerformPrompt,
  ScavengerItem,
  WheelPuzzle,
} from "../shared/types";
import { initFeudLibrary } from "./feud";
import {
  buildMillionaireQuestions,
  buildSlotBank,
  DIFFICULTY_SLOTS,
  DifficultyBank,
  MillionairePool,
  shuffleArray,
} from "../shared/slots";
import { fetchTriviaQuestions } from "./trivia";

// The slot scheme now lives in shared/slots.ts (the client sandbox uses it
// too). Re-exported under the old names so other server files are unchanged.
export const DIFFICULTY_MAPPING = DIFFICULTY_SLOTS;
export { shuffleArray };
export type { MillionairePool };

// Millionaire trivia comes from OpenTDB, which rate-limits to ~1 request per
// 5s per IP. Fetching it fresh per room would make "Create Game" take
// 10-30s. Instead we fetch one larger pool at server startup and have every
// room draw a reshuffled slice from it — room creation is then instant, and
// simultaneous rooms occasionally share a question, which is an acceptable
// trade for not depending on a rate-limited external call per game.
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
    ...createPartyGameData(),
  };
}

// The party board's games (the Party page of src/data/boards/standard.json), reshuffled per room
// from the bundled banks, the same slot scheme as the others.
export function createPartyGameData(): Pick<
  GameData,
  "wheel" | "act" | "charades" | "scavenger" | "closest" | "order"
> {
  const bank = <T,>(source: unknown) => buildSlotBank(source as DifficultyBank<T>);
  return {
    wheel: bank<WheelPuzzle>(partyGamesJson.wheel),
    act: bank<PerformPrompt>(partyGamesJson.act),
    charades: bank<CharadesPrompt>(partyGamesJson.charades),
    scavenger: bank<ScavengerItem>(partyGamesJson.scavenger),
    closest: bank<ClosestQuestion>(partyGamesJson.closest),
    order: bank<OrderPuzzle>(partyGamesJson.order),
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

