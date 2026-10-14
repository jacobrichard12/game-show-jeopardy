import fs from "fs";
import partyGamesJson from "../data/partyGames.json";
import path from "path";
import { BoardColumn, CUSTOM_PAGE_ID, MAX_ROWS, standardColumnTitle, TILE_VALUES } from "../shared/boardLayout";
import { DECOR_IDS, DecorId, isDecorId } from "../shared/decor";
import {
  GameData,
  GameName,
  getGameTitle,
  MillionaireQuestion,
  mixedTileKey,
  PerformMode,
  SIDE_CHARADES_KEY,
} from "../shared/types";

// Custom content packs (ROADMAP C5, C6): JSON files in src/data/custom/, each
// defining a board: one page of up to 6 columns ("columns"), or several tabbed
// pages ("pages"), each column a title + a game type + optional hand-written
// questions. Tiles a column doesn't fill come from the
// normal sources (Feud CSVs, OpenTDB, the banks). Read by the server only, so
// pack questions reach a browser only through a real game. The format is
// documented in PROJECT_CONTEXT.md §10.
//
// Read from the working directory at runtime, like the Feud CSVs (the server
// starts from the repo root), so adding a pack needs no rebuild of the client.
export const PACKS_DIR = path.resolve("src/data/custom");

type PackGame = keyof GameData;
export const PACK_GAMES: PackGame[] = [
  "feud",
  "millionaire",
  "minute",
  "head",
  "wheel",
  "act",
  "charades",
  "scavenger",
  "closest",
  "order",
];

export interface PackSummary {
  id: string; // file name without .json
  name: string;
}

export interface LoadedPack extends PackSummary {
  // The lobby title screen: "title" (default: the pack's name) + "subtitle",
  // and "decor" (floating symbols, shared/decor.ts).
  titleScreen: { title: string; subtitle?: string; decor?: DecorId };
  // The board's pages (tabs), each its columns left to right (titles
  // defaulted; invalid columns dropped). A one-page pack is one page labeled
  // with the pack's name.
  // A side-game page has no columns: its tab goes straight into that game
  // (Reverse Charades), with the page's own words or the whole bank.
  pages: { label: string; columns: BoardColumn[]; sideGame?: "charades"; words?: string[] }[];
  // Every page's columns, in order.
  columns: BoardColumn[];
  // Tiles down each column (1–5; round 1 = 100…rows×100, round 2 doubled).
  rows: number;
  // false = a single round: no Double Jeopardy, round 2 questions unused.
  doubleJeopardy: boolean;
  // true = the TV never shows the join code ("hideJoinCode").
  hideJoinCode: boolean;
  // game -> slot key (as used by the banks) -> question
  tiles: Partial<Record<PackGame, Record<string, unknown>>>;
  errors: string[];
}

export const MAX_COLUMNS = 6; // about the most a TV shows legibly (per page)
export const MAX_PAGES = 4;
export const MAX_PAGE_LABEL_LENGTH = 30;
export const MAX_TITLE_LENGTH = 60;
export const MAX_SUBTITLE_LENGTH = 120;

// A tile's bank key: round 1 uses the displayed value (100–500); round 2
// (Double Jeopardy) shows 200–1000 and is stored at value / 2 + 1 (101–501),
// matching getCurrentQuestion().
export function slotKeyFor(round: unknown, value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (round === 1 && value >= 100 && value <= 500 && value % 100 === 0) return value;
  if (round === 2 && value >= 200 && value <= 1000 && value % 200 === 0) return value / 2 + 1;
  return null;
}

const isText = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const isTextList = (v: unknown, min = 1): v is string[] =>
  Array.isArray(v) && v.length >= min && v.every(isText);
const optionalNumber = (v: unknown) => v === undefined || (typeof v === "number" && v > 0);

// Checks one entry and returns the question as the game expects it (pack-only
// fields stripped, optional fields defaulted), or an error message.
function toQuestion(game: PackGame, e: any): { question?: unknown; error?: string } {
  switch (game) {
    case "feud":
      if (!isText(e.prompt)) return { error: "needs a prompt" };
      if (
        !Array.isArray(e.answers) ||
        e.answers.length === 0 ||
        !e.answers.every((a: any) => isText(a?.answer) && typeof a.points === "number" && a.points > 0)
      )
        return { error: "needs answers: [{ answer, points > 0 }, …]" };
      return { question: { prompt: e.prompt, answers: e.answers.map((a: any) => ({ answer: a.answer, points: a.points })) } };
    case "millionaire": {
      if (!Array.isArray(e.questions) || e.questions.length !== 3)
        return { error: "needs exactly 3 questions (the tile's ladder)" };
      for (const q of e.questions) {
        if (!isText(q?.question)) return { error: "each question needs question text" };
        if (!isTextList(q.answers) || q.answers.length !== 4) return { error: "each question needs 4 answers" };
        if (![0, 1, 2, 3].includes(q.correctAnswerIdx)) return { error: "each question needs correctAnswerIdx 0–3" };
      }
      const tile: MillionaireQuestion = {
        questions: e.questions.map((q: any) => ({
          question: q.question,
          category: isText(q.category) ? q.category : "Custom",
          answers: q.answers,
          correctAnswerIdx: q.correctAnswerIdx,
        })),
      };
      return { question: tile };
    }
    case "minute":
      if (!isText(e.title)) return { error: "needs a title" };
      // The demo video is optional in packs: without one the TV shows just
      // the title and the host explains it (and can use Toggle Timer).
      if (e.link !== undefined && (!isText(e.link) || !/^https:\/\/(www\.)?youtube\.com\/watch\?v=/.test(e.link)))
        return { error: "link must look like https://www.youtube.com/watch?v=… (or leave it out)" };
      return {
        question: {
          title: e.title,
          link: isText(e.link) ? e.link : "",
          materials: isTextList(e.materials, 0) ? e.materials : [],
          description: isText(e.description) ? e.description : "",
        },
      };
    case "head":
      if (!isText(e.title)) return { error: "needs a title" };
      if (typeof e.players !== "number" || e.players < 1) return { error: "needs players (1 or more)" };
      return { question: { title: e.title, players: e.players, adminInfo: isText(e.adminInfo) ? e.adminInfo : "" } };
    case "wheel":
      if (!isText(e.category)) return { error: "needs a category" };
      if (!isText(e.phrase) || !/[A-Za-z]/.test(e.phrase)) return { error: "needs a phrase with letters" };
      return { question: { category: e.category, phrase: e.phrase.toUpperCase() } };
    case "act": {
      const modes: PerformMode[] = ["act", "draw", "describe"];
      if (!modes.includes(e.mode)) return { error: 'needs mode "act", "draw" or "describe"' };
      if (!isText(e.word)) return { error: "needs a word" };
      if (e.taboo !== undefined && !isTextList(e.taboo, 0)) return { error: "taboo must be a list of words" };
      if (!optionalNumber(e.seconds)) return { error: "seconds must be a positive number" };
      return { question: pick(e, ["mode", "word", "taboo", "seconds"]) };
    }
    case "charades":
      if (e.category !== undefined && !isText(e.category)) return { error: "category must be text (or leave it out)" };
      if (!optionalNumber(e.seconds)) return { error: "seconds must be a positive number" };
      // No words: the tile plays from the pack's Reverse Charades side-game
      // list (sharing its place), or the whole bank if there's no side game.
      if (e.words === undefined) return { question: { ...pick(e, ["category", "seconds"]), words: [], shared: true } };
      if (!isTextList(e.words)) return { error: "words must be a list of words (or leave it out to share the side game's)" };
      return { question: pick(e, ["category", "words", "seconds"]) };
    case "scavenger":
      if (!isText(e.item)) return { error: "needs an item" };
      if (!optionalNumber(e.seconds)) return { error: "seconds must be a positive number" };
      return { question: pick(e, ["item", "seconds"]) };
    case "closest":
      if (!isText(e.prompt)) return { error: "needs a prompt" };
      if (typeof e.answer !== "number" || !Number.isFinite(e.answer)) return { error: "needs a numeric answer" };
      if (e.rule !== undefined && e.rule !== "closest" && e.rule !== "noOver")
        return { error: 'rule must be "closest" or "noOver"' };
      return { question: pick(e, ["prompt", "answer", "unit", "rule", "plain"]) };
    case "order":
      if (!isText(e.prompt)) return { error: "needs a prompt" };
      if (!isText(e.direction)) return { error: 'needs a direction, e.g. "smallest first"' };
      if (!isTextList(e.items, 2) || new Set(e.items).size !== e.items.length)
        return { error: "needs 2 or more different items, in the correct order" };
      return { question: pick(e, ["prompt", "direction", "items"]) };
  }
  return { error: "unknown game" };
}

function pick(e: any, keys: string[]) {
  const out: Record<string, unknown> = {};
  keys.forEach((k) => {
    if (e[k] !== undefined) out[k] = e[k];
  });
  return out;
}

// Validates a parsed pack. Bad columns and questions are dropped and
// reported; the rest still load, so one typo doesn't sink a night's pack.
export function parsePack(id: string, json: unknown): LoadedPack {
  const pack: LoadedPack = {
    id,
    name: id,
    titleScreen: { title: id },
    pages: [],
    columns: [],
    rows: MAX_ROWS,
    doubleJeopardy: true,
    hideJoinCode: false,
    tiles: {},
    errors: [],
  };
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    pack.errors.push("the file must be a JSON object");
    return pack;
  }
  const data = json as Record<string, unknown>;
  if (isText(data.name)) pack.name = data.name.trim();

  // Lobby title screen: optional, capped so it fits on a TV.
  const screenText = (key: "title" | "subtitle", max: number): string | undefined => {
    const value = data[key];
    if (value === undefined) return undefined;
    if (!isText(value)) {
      pack.errors.push(`"${key}" must be text`);
      return undefined;
    }
    if (value.trim().length > max) pack.errors.push(`"${key}" is over ${max} characters (shortened)`);
    return value.trim().slice(0, max);
  };
  const title = screenText("title", MAX_TITLE_LENGTH);
  const subtitle = screenText("subtitle", MAX_SUBTITLE_LENGTH);
  let decor: DecorId | undefined;
  if (data.decor !== undefined) {
    if (isDecorId(data.decor)) decor = data.decor;
    else pack.errors.push(`"decor" must be one of: ${DECOR_IDS.join(", ")} (ignored)`);
  }
  pack.titleScreen = {
    title: title ?? pack.name,
    ...(subtitle ? { subtitle } : {}),
    ...(decor ? { decor } : {}),
  };

  const formatKeys = ["name", "title", "subtitle", "decor", "rows", "doubleJeopardy", "hideJoinCode", "columns", "pages"];
  Object.keys(data).forEach((key) => {
    if (formatKeys.includes(key)) return;
    if (PACK_GAMES.includes(key as PackGame))
      pack.errors.push(`"${key}": questions now go inside a column (see template.json)`);
    else
      pack.errors.push(
        `"${key}" isn't part of the format (use "name", "title", "subtitle", "decor", "rows", "doubleJeopardy", "hideJoinCode", and "columns" or "pages")`
      );
  });

  // Board height: tiles per column (default 5).
  if (data.rows !== undefined) {
    if (typeof data.rows === "number" && Number.isInteger(data.rows) && data.rows >= 1 && data.rows <= MAX_ROWS)
      pack.rows = data.rows;
    else pack.errors.push(`"rows" must be a whole number from 1 to ${MAX_ROWS} (using ${MAX_ROWS})`);
  }

  if (data.doubleJeopardy !== undefined) {
    if (typeof data.doubleJeopardy === "boolean") pack.doubleJeopardy = data.doubleJeopardy;
    else pack.errors.push('"doubleJeopardy" must be true or false (using true)');
  }

  if (data.hideJoinCode !== undefined) {
    if (typeof data.hideJoinCode === "boolean") pack.hideJoinCode = data.hideJoinCode;
    else pack.errors.push('"hideJoinCode" must be true or false (using false)');
  }

  // One page ("columns") or several tabbed pages ("pages": [{ label, columns }]).
  let pageSpecs: { label: string; columns: unknown; where: string; sideGame?: unknown; words?: unknown }[];
  if (data.pages !== undefined) {
    if (data.columns !== undefined) pack.errors.push('use "columns" (one page) or "pages", not both (using "pages")');
    if (!Array.isArray(data.pages) || data.pages.length === 0) {
      pack.errors.push(`"pages" must be a list of 1–${MAX_PAGES} pages: [{ "label", "columns" }]`);
      return pack;
    }
    if (data.pages.length > MAX_PAGES)
      pack.errors.push(`${data.pages.length} pages: only the first ${MAX_PAGES} are used`);
    pageSpecs = data.pages.slice(0, MAX_PAGES).map((page: any, p: number) => {
      const where = `pages[${p}]`;
      let label = pack.name;
      if (isText(page?.label)) {
        if (page.label.trim().length > MAX_PAGE_LABEL_LENGTH)
          pack.errors.push(`${where}: "label" is over ${MAX_PAGE_LABEL_LENGTH} characters (shortened)`);
        label = page.label.trim().slice(0, MAX_PAGE_LABEL_LENGTH);
      } else {
        pack.errors.push(`${where}: needs a "label" (the tab's name)`);
        label = `Page ${p + 1}`;
      }
      return { label, columns: page?.columns, where: `${where}.`, sideGame: page?.sideGame, words: page?.words };
    });
  } else {
    pageSpecs = [{ label: pack.name, columns: data.columns, where: "" }];
  }

  pageSpecs.forEach((spec) => {
    if (spec.sideGame !== undefined) {
      const where = spec.where.slice(0, -1);
      if (spec.sideGame !== "charades") {
        pack.errors.push(`${where}: "sideGame" must be "charades" (page skipped)`);
        return;
      }
      if (pack.pages.some((page) => page.sideGame === "charades")) {
        pack.errors.push(`${where}: only one Reverse Charades side game per pack (page skipped)`);
        return;
      }
      if (spec.columns !== undefined) pack.errors.push(`${where}: a side-game page has no "columns" (ignored)`);
      let words: string[] | undefined;
      if (spec.words !== undefined) {
        if (isTextList(spec.words)) words = Array.from(new Set(spec.words.map((w) => w.trim())));
        else pack.errors.push(`${where}: "words" must be a list of words (using the whole Reverse Charades bank)`);
      }
      pack.pages.push({ label: spec.label, columns: [], sideGame: "charades", ...(words ? { words } : {}) });
      return;
    }
    const columns = parseColumns(pack, spec.columns, spec.where);
    if (columns.length > 0) pack.pages.push({ label: spec.label, columns });
  });
  pack.columns = pack.pages.flatMap((page) => page.columns);
  return pack;
}

// Parses one page's columns into the pack (questions into pack.tiles),
// returning the valid ones.
function parseColumns(pack: LoadedPack, raw: unknown, prefix: string): BoardColumn[] {
  const page: BoardColumn[] = [];
  if (!Array.isArray(raw) || raw.length === 0) {
    pack.errors.push(`${prefix || ""}needs "columns": a list of 1–${MAX_COLUMNS} columns`);
    return page;
  }
  if (raw.length > MAX_COLUMNS)
    pack.errors.push(`${prefix}${raw.length} columns: only the first ${MAX_COLUMNS} are used (TV width)`);
  const topRound1 = pack.rows * 100;

  raw.slice(0, MAX_COLUMNS).forEach((column: any, c) => {
    const where = `${prefix}columns[${c}]`;
    const game = column?.game as PackGame;
    if (!PACK_GAMES.includes(game)) {
      pack.errors.push(`${where}: "game" must be one of ${PACK_GAMES.join(", ")}`);
      return;
    }
    // Across all pages: a game's state and question bank are shared.
    const taken = [...pack.pages.flatMap((p) => p.columns), ...page];
    if (taken.some((existing) => existing.game === game)) {
      pack.errors.push(`${where}: ${game} is already a column (one column per game type, across all pages)`);
      return;
    }
    if (column.title !== undefined && !isText(column.title))
      pack.errors.push(`${where}: "title" must be text (using the default)`);
    const title = isText(column.title)
      ? column.title.trim()
      : standardColumnTitle(game) ?? getGameTitle(game as GameName);
    const entry: BoardColumn = { title, game };
    page.push(entry);

    if (column.questions === undefined) return; // all normal questions
    if (!Array.isArray(column.questions)) {
      pack.errors.push(`${where}: "questions" must be a list`);
      return;
    }
    const usedSlots = new Set<number>();
    const mixed: Record<string, string> = {};
    column.questions.forEach((q: any, i: number) => {
      const qWhere = `${where} (${game}) questions[${i}]`;
      // A tile can play as another game ("type"), e.g. a Scavenger Sprint
      // challenge in a Head to Head column. Its question is stored under its
      // own column (mixedTileKey), so it never collides with that game's own
      // column, even one on another page.
      const playAs = (q?.type ?? game) as PackGame;
      if (!PACK_GAMES.includes(playAs)) {
        pack.errors.push(`${qWhere}: "type" must be one of ${PACK_GAMES.join(", ")}`);
        return;
      }
      const key = slotKeyFor(q?.round, q?.value);
      if (key === null) {
        pack.errors.push(`${qWhere}: needs round 1 with value 100–500, or round 2 with value 200–1000 (steps of 100 / 200)`);
        return;
      }
      if (q.round === 2 && !pack.doubleJeopardy) {
        pack.errors.push(`${qWhere}: round 2 isn't played ("doubleJeopardy": false)`);
        return;
      }
      if (q.value > topRound1 * q.round) {
        pack.errors.push(
          `${qWhere}: round ${q.round} ${q.value} isn't on this ${pack.rows}-row board (round 1 goes up to ${topRound1}, round 2 up to ${topRound1 * 2})`
        );
        return;
      }
      const { question, error } = toQuestion(playAs, q);
      if (error) {
        pack.errors.push(`${qWhere}: ${error}`);
        return;
      }
      if (usedSlots.has(key)) {
        pack.errors.push(`${qWhere}: round ${q.round} ${q.value} is already used by an earlier question`);
        return;
      }
      usedSlots.add(key);
      const tiles = (pack.tiles[playAs] ??= {});
      tiles[playAs === game ? String(key) : mixedTileKey(game, key)] = question;
      if (playAs !== game) mixed[String(key)] = playAs;
    });
    if (Object.keys(mixed).length > 0) entry.tiles = mixed;
  });
  return page;
}

// The pack's board as GameState.board: its pages as tabs ("custom",
// "custom-2", …; the first id marks a custom board).
export function packBoard(pack: LoadedPack) {
  return pack.pages.map((page, i) => ({
    id: i === 0 ? CUSTOM_PAGE_ID : `${CUSTOM_PAGE_ID}-${i + 1}`,
    label: page.label,
    columns: page.columns,
    values: TILE_VALUES.slice(0, pack.rows),
    ...(page.sideGame ? { sideGame: page.sideGame } : {}),
  }));
}

const packFiles = (): string[] => {
  try {
    return fs
      .readdirSync(PACKS_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort();
  } catch {
    return []; // no custom folder = no packs
  }
};

export function loadPack(id: string): LoadedPack | null {
  // Only names that exist in the folder, so a request can't reach other files.
  if (!packFiles().includes(`${id}.json`)) return null;
  const file = path.join(PACKS_DIR, `${id}.json`);
  try {
    return parsePack(id, JSON.parse(fs.readFileSync(file, "utf8")));
  } catch (error) {
    return {
      id,
      name: id,
      titleScreen: { title: id },
      pages: [],
      columns: [],
      rows: MAX_ROWS,
      doubleJeopardy: true,
      hideJoinCode: false,
      tiles: {},
      errors: [`not valid JSON: ${(error as Error).message}`],
    };
  }
}

// Names for the create-game dropdown (no questions leave the server). Files
// starting with "_" are hidden from it (e.g. a draft); they still load, so
// check-pack keeps validating them.
export function listPacks(): PackSummary[] {
  return packFiles()
    .filter((f) => !f.startsWith("_"))
    .map((f) => loadPack(f.slice(0, -".json".length)))
    .filter((p): p is LoadedPack => p !== null)
    .map(({ id, name }) => ({ id, name }));
}

// Puts the pack's questions on their tiles, over the normal banks.
export function applyPack(gameData: GameData, pack: LoadedPack): GameData {
  const result: GameData = { ...gameData };
  PACK_GAMES.forEach((game) => {
    const tiles = pack.tiles[game];
    if (!tiles) return;
    (result as any)[game] = { ...((gameData as any)[game] ?? {}), ...tiles };
  });
  // The Reverse Charades side game's list, shuffled per room: the page's own
  // words, or every word in the bank.
  const side = pack.pages.find((page) => page.sideGame === "charades");
  if (side) {
    result.charades = {
      ...(result.charades ?? {}),
      [SIDE_CHARADES_KEY]: { category: side.label, words: shuffle(side.words ?? allCharadesWords()) },
    };
  } else if (result.charades) {
    // Tiles meant to share a side game that isn't there get the whole bank.
    const charades = { ...result.charades };
    Object.keys(charades).forEach((key) => {
      if (charades[key].shared) charades[key] = { ...charades[key], words: shuffle(allCharadesWords()), shared: false };
    });
    result.charades = charades;
  }
  return result;
}

// Every word in the Reverse Charades bank (all difficulties and categories).
export function allCharadesWords(): string[] {
  const bank = partyGamesJson.charades as Record<string, { words: string[] }[]>;
  return Array.from(new Set(Object.values(bank).flat().flatMap((prompt) => prompt.words)));
}

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
