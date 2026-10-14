import { GameName, GameState, getCurrentQuestion, withGamePrefix } from "../shared/types";

// One line for the host's "Up next:" before the reveal (Next), so the host
// can get ready. Admin page only; the TV shows the waiting screen.
// A mixed tile gets the same game-name prefix as its revealed name.
export function questionPreview(gameState: GameState): string | undefined {
  const text = previewText(gameState);
  return text === undefined ? undefined : withGamePrefix(gameState, text);
}

function previewText(gameState: GameState): string | undefined {
  const game = gameState.currentGame.gameName;
  const bank = (gameState.gameData as unknown as Record<string, Record<string, any>> | undefined)?.[game];
  const q: any = bank ? getCurrentQuestion(bank, gameState) : undefined;
  if (!q) return undefined;
  switch (game) {
    case GameName.FAMILY_FEUD:
      return q.prompt;
    case GameName.MILLIONAIRE:
      return q.questions?.[0]?.question;
    case GameName.MINUTE:
      return q.title;
    case GameName.HEAD_TO_HEAD:
      return q.title;
    case GameName.WHEEL:
      return `${q.category}: ${q.phrase}`;
    case GameName.ACT:
      return `${q.mode[0].toUpperCase()}${q.mode.slice(1)}: ${q.word}`;
    case GameName.CHARADES:
      return q.shared ? "words from the Reverse Charades tab" : q.category;
    case GameName.SCAVENGER:
      return q.item;
    case GameName.CLOSEST:
    case GameName.ORDER:
      return q.prompt;
    default:
      return undefined;
  }
}
