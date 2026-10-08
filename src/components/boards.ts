import { boardPages, currentBoardPage, TILE_VALUES } from "../shared/boardLayout";
import { GameState } from "../shared/types";
import { GameBoardData } from "./GameBoard";

// The board pages the host can switch between (shared/boardLayout.ts): the
// Standard board's Classic and Party pages, or a custom pack's single page.
// The TV shows whichever page the host is on (GameState.boardPage).
export function boardPageTabs(gameState: GameState): { id: string; label: string }[] {
  return boardPages(gameState).map(({ id, label }) => ({ id, label }));
}

// The columns of the page on screen, in the shape GameBoard renders.
export function boardData(gameState: GameState): Record<string, GameBoardData> {
  const data: Record<string, GameBoardData> = {};
  currentBoardPage(gameState).columns.forEach((column) => {
    data[column.game] = { gameName: column.game, gameTitle: column.title, points: TILE_VALUES };
  });
  return data;
}
