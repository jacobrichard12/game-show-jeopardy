import fs from "fs";
import path from "path";
import { GameData, MillionaireQuestion, PerformMode } from "../shared/types";

// Custom content packs (ROADMAP C5): JSON files in src/data/custom/ that put
// hand-written questions on chosen tiles; every other tile keeps the normal
// banks. Read by the server only, so pack questions reach a browser only
// through a real game. The format is documented in PROJECT_CONTEXT.md §10.
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
  // game -> slot key (as used by the banks) -> question
  tiles: Partial<Record<PackGame, Record<string, unknown>>>;
  errors: string[];
}

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
      if (!isText(e.link) || !/^https:\/\/(www\.)?youtube\.com\/watch\?v=/.test(e.link))
        return { error: "needs a link like https://www.youtube.com/watch?v=…" };
      return {
        question: {
          title: e.title,
          link: e.link,
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
      if (!isText(e.category)) return { error: "needs a category" };
      if (!isTextList(e.words)) return { error: "needs words: [ … ]" };
      if (!optionalNumber(e.seconds)) return { error: "seconds must be a positive number" };
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

// Validates a parsed pack. Bad entries are dropped and reported; the rest
// still load, so one typo doesn't sink a whole night's pack.
export function parsePack(id: string, json: unknown): LoadedPack {
  const pack: LoadedPack = { id, name: id, tiles: {}, errors: [] };
  if (!json || typeof json !== "object" || Array.isArray(json)) {
    pack.errors.push("the file must be a JSON object");
    return pack;
  }
  const data = json as Record<string, unknown>;
  if (isText(data.name)) pack.name = data.name.trim();

  Object.keys(data).forEach((key) => {
    if (key !== "name" && !PACK_GAMES.includes(key as PackGame))
      pack.errors.push(`"${key}" isn't a game (use ${PACK_GAMES.join(", ")})`);
  });

  PACK_GAMES.forEach((game) => {
    const entries = data[game];
    if (entries === undefined) return;
    if (!Array.isArray(entries)) {
      pack.errors.push(`${game}: must be a list`);
      return;
    }
    entries.forEach((entry, i) => {
      const where = `${game}[${i}]`;
      const key = slotKeyFor(entry?.round, entry?.value);
      if (key === null) {
        pack.errors.push(`${where}: needs round 1 with value 100–500, or round 2 with value 200–1000 (steps of 100 / 200)`);
        return;
      }
      const { question, error } = toQuestion(game, entry);
      if (error) {
        pack.errors.push(`${where}: ${error}`);
        return;
      }
      const tiles = (pack.tiles[game] ??= {});
      if (tiles[key] !== undefined) {
        pack.errors.push(`${where}: round ${entry.round} ${entry.value} is already used by an earlier ${game} entry`);
        return;
      }
      tiles[key] = question;
    });
  });
  return pack;
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
    return { id, name: id, tiles: {}, errors: [`not valid JSON: ${(error as Error).message}`] };
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
  return result;
}
