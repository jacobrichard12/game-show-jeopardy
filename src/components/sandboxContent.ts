// What the sandbox pages play with: the bundled sample questions (filler
// only, ROADMAP S2: whatever these pages import ships in the public JS
// bundle, so real questions must never be imported here), a content pack
// loaded from the server merged over them, and fresh game states.
import sandboxFeud from "../data/sandbox/feud.json";
import headToHeadBank from "../data/sandbox/head.json";
import sandboxMillionaire from "../data/sandbox/millionaire.json";
import minuteBank from "../data/sandbox/minute.json";
import partyGames from "../data/sandbox/party.json";
import { buildMillionaireQuestions, buildSlotBank, DifficultyBank, MillionairePool } from "../shared/slots";
import { ThemeId } from "../shared/themes";
import {
  CharadesPrompt,
  ClosestQuestion,
  createDefaultTeams,
  FamilyFeudQuestion,
  GameData,
  GameName,
  GameState,
  HeadToHeadQuestion,
  MinuteQuestion,
  OrderPuzzle,
  PerformPrompt,
  SandboxPack,
  ScavengerItem,
  WheelPuzzle as WheelPuzzleData,
} from "../shared/types";

function asBank<T>(bank: unknown): DifficultyBank<T> {
  return bank as DifficultyBank<T>;
}

// Slots the sandbox's banks into a GameData with the same scheme the server
// uses. Minute and Head to Head read the real bank files; Feud and Millionaire
// can't (the server reads CSVs from disk and calls the OpenTDB API), so they
// use bundled samples in src/data/sandbox*.json.
export function buildSandboxGameData(): GameData {
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
export function withPack(sample: GameData, pack: SandboxPack | null): GameData {
  if (!pack) return sample;
  const merged = { ...sample } as Record<string, Record<string, unknown>>;
  Object.entries(pack.gameData).forEach(([game, tiles]) => {
    merged[game] = { ...(merged[game] ?? {}), ...(tiles as Record<string, unknown>) };
  });
  return merged as unknown as GameData;
}

// The pack's layout and title screen, so mixed tiles, the side game and the
// TV options behave as in a real game. Without a pack: the Standard board.
export function packFields(pack: SandboxPack | null): Partial<GameState> {
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

// A fresh sandbox game with the chosen content (sample, or a pack over it).
export function freshBase(teamCount: number, pack: SandboxPack | null): GameState {
  return {
    ...newSandboxState(teamCount),
    ...packFields(pack),
    gameData: withPack(buildSandboxGameData(), pack),
  };
}

// A new full game: the lobby, with the chosen content and its layout.
export function freshFullGame(teamCount: number, pack: SandboxPack | null, theme: ThemeId): GameState {
  const base = freshBase(teamCount, pack);
  return {
    ...base,
    started: false,
    theme,
    boardPage: pack?.board[0]?.id,
    currentGame: { gameName: GameName.BOARD, gameTitle: "GameBoard", value: 0, questionState: { promptVisible: false } },
  };
}
