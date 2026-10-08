import standardBoard from "../data/boards/standard.json";

// Board layouts (ROADMAP C6). A board is one or more pages of columns; each
// column is a title plus the game that plays there. The Standard board
// (src/data/boards/standard.json) has two pages, Classic and Party; a custom
// content pack (server/packs.ts) defines a single page, which the server puts
// in GameState.board. No questions live here, so it's safe in the browser.
export interface BoardColumn {
  title: string;
  game: string; // a GameData key: "feud", "millionaire", "wheel", ...
}

export interface BoardLayoutPage {
  id: string;
  label: string;
  columns: BoardColumn[];
}

export const STANDARD_PAGES: BoardLayoutPage[] = standardBoard.pages;
export const CUSTOM_PAGE_ID = "custom";
// Round 1 tile values; Double Jeopardy doubles what the board shows.
export const TILE_VALUES = [100, 200, 300, 400, 500];

interface HasBoard {
  board?: BoardLayoutPage[];
  boardPage?: string;
}

// The pages a game shows: its own board if it has one, else Standard.
export function boardPages(state: HasBoard): BoardLayoutPage[] {
  return state.board && state.board.length > 0 ? state.board : STANDARD_PAGES;
}

// The page on screen now (falls back to the first page).
export function currentBoardPage(state: HasBoard): BoardLayoutPage {
  const pages = boardPages(state);
  return pages.find((page) => page.id === state.boardPage) ?? pages[0];
}

export function isCustomBoard(state: HasBoard): boolean {
  return boardPages(state)[0]?.id === CUSTOM_PAGE_ID;
}

// A custom board's title for a game's column (custom boards only, so the
// Standard game keeps its usual question-page titles).
export function customColumnTitle(state: HasBoard, game: string): string | undefined {
  if (!isCustomBoard(state)) return undefined;
  return boardPages(state)[0].columns.find((column) => column.game === game)?.title;
}

// The Standard board's title for a game, used as a custom column's default.
export function standardColumnTitle(game: string): string | undefined {
  for (const page of STANDARD_PAGES) {
    const column = page.columns.find((c) => c.game === game);
    if (column) return column.title;
  }
  return undefined;
}
