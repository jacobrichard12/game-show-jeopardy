import standardBoard from "../data/boards/standard.json";

// Board layouts (ROADMAP C6). A board is one or more pages of columns; each
// column is a title plus the game that plays there. The Standard board
// (src/data/boards/standard.json) has two pages, Classic and Party; a custom
// content pack (server/packs.ts) defines one page or several, which the
// server puts in GameState.board. No questions live here, so it's safe in the browser.
export interface BoardColumn {
  title: string;
  game: string; // a GameData key: "feud", "millionaire", "wheel", ...
  // Tiles that play as another game (custom packs): slot key -> game, e.g.
  // { "200": "scavenger" } in a Head to Head column.
  tiles?: Record<string, string>;
}

export interface BoardLayoutPage {
  id: string;
  label: string;
  columns: BoardColumn[];
  // Round 1 tile values down each column (a custom pack's "rows"); missing =
  // all of TILE_VALUES (the usual 5 rows).
  values?: number[];
  // A side-game page has no tiles: picking its tab goes straight into that
  // game, played in open-ended rounds (SideCharades). Custom packs only.
  sideGame?: "charades";
}

export const STANDARD_PAGES: BoardLayoutPage[] = standardBoard.pages;
export const CUSTOM_PAGE_ID = "custom";
// Round 1 tile values; Double Jeopardy doubles what the board shows. A board
// can use fewer rows (the first N values); 5 is the most the normal question
// banks fill.
export const TILE_VALUES = [100, 200, 300, 400, 500];
export const MAX_ROWS = TILE_VALUES.length;

// The round 1 values a page's columns use.
export function pageValues(page: BoardLayoutPage): number[] {
  return page.values && page.values.length > 0 ? page.values : TILE_VALUES;
}

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

// The game a tile plays as: its column's game unless the pack mixed in
// another type for that tile. `slotKey` is the bank key (DJ: value/2 + 1).
export function tileGame(state: HasBoard, columnGame: string, slotKey: number): string {
  const column = boardPages(state)
    .flatMap((page) => page.columns)
    .find((c) => c.game === columnGame);
  return column?.tiles?.[String(slotKey)] ?? columnGame;
}

export function isCustomBoard(state: HasBoard): boolean {
  return boardPages(state)[0]?.id === CUSTOM_PAGE_ID;
}

// A custom board's title for a game's column (custom boards only, so the
// Standard game keeps its usual question-page titles).
export function customColumnTitle(state: HasBoard, game: string): string | undefined {
  if (!isCustomBoard(state)) return undefined;
  return boardPages(state)
    .flatMap((page) => page.columns)
    .find((column) => column.game === game)?.title;
}

// The Standard board's title for a game, used as a custom column's default.
export function standardColumnTitle(game: string): string | undefined {
  for (const page of STANDARD_PAGES) {
    const column = page.columns.find((c) => c.game === game);
    if (column) return column.title;
  }
  return undefined;
}
