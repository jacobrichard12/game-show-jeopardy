import classicBoard from "../data/gameBoard.json";
import partyBoard from "../data/partyBoard.json";
import { BoardPage } from "../shared/types";
import { GameBoardData } from "./GameBoard";

// The board pages the host can switch between. The TV shows whichever page
// the host is on (GameState.boardPage), so the room sees the same board.
export const BOARD_PAGES: { id: BoardPage; label: string; data: Record<string, GameBoardData> }[] = [
  { id: "classic", label: "Classic Games", data: classicBoard },
  { id: "party", label: "Party Games", data: partyBoard },
];

export function boardData(page: BoardPage | undefined): Record<string, GameBoardData> {
  return (BOARD_PAGES.find((board) => board.id === page) ?? BOARD_PAGES[0]).data;
}
