import { applyPack, listPacks, loadPack, packBoard, parsePack, slotKeyFor } from "./packs";
import { GameData } from "../shared/types";

const ladder = [1, 2, 3].map((n) => ({
  question: `Q${n}`,
  answers: ["A", "B", "C", "D"],
  correctAnswerIdx: n % 4,
}));

describe("slotKeyFor", () => {
  it("maps round 1 values to themselves and round 2 to value / 2 + 1", () => {
    expect(slotKeyFor(1, 100)).toBe(100);
    expect(slotKeyFor(1, 500)).toBe(500);
    expect(slotKeyFor(2, 200)).toBe(101);
    expect(slotKeyFor(2, 1000)).toBe(501);
  });

  it("rejects values that aren't tiles", () => {
    expect(slotKeyFor(1, 600)).toBeNull();
    expect(slotKeyFor(1, 150)).toBeNull();
    expect(slotKeyFor(2, 100)).toBeNull();
    expect(slotKeyFor(2, 300)).toBeNull();
    expect(slotKeyFor(3, 200)).toBeNull();
    expect(slotKeyFor("1", 100)).toBeNull();
  });
});

// One column for a game, with its questions.
const col = (game: string, questions?: unknown[], title?: string) => ({
  game,
  ...(title ? { title } : {}),
  ...(questions ? { questions } : {}),
});

describe("parsePack", () => {
  it("loads a one-page board: titles, defaults, and every game's question shape", () => {
    const pack = parsePack("family", {
      name: "Family night",
      columns: [
        col("feud", [{ round: 1, value: 100, prompt: "Name a pet", answers: [{ answer: "Dog", points: 50 }] }], "Smith Feud"),
        col("millionaire", [{ round: 2, value: 400, questions: ladder }]),
        col("minute", [{ round: 1, value: 200, title: "Stack it", link: "https://www.youtube.com/watch?v=abc" }]),
        col("head", [{ round: 1, value: 300, title: "Staring contest", players: 1 }]),
        col("wheel", [{ round: 1, value: 100, category: "Family", phrase: "Grandma's house" }]),
        col("closest", [{ round: 1, value: 100, prompt: "Grandpa's age", answer: 88, rule: "noOver" }]),
      ],
    });
    expect(pack.errors).toEqual([]);
    expect(pack.name).toBe("Family night");
    expect(pack.columns).toEqual([
      { title: "Smith Feud", game: "feud" },
      { title: "Who Wants to be a Millionaire", game: "millionaire" }, // Standard's title
      { title: "Minute To Win It", game: "minute" },
      { title: "Head to Head", game: "head" },
      { title: "Guess That Word", game: "wheel" },
      { title: "Closest Wins", game: "closest" },
    ]);
    expect(pack.tiles.feud![100]).toEqual({ prompt: "Name a pet", answers: [{ answer: "Dog", points: 50 }] });
    expect((pack.tiles.millionaire![201] as any).questions[0].category).toBe("Custom");
    expect(pack.tiles.minute![200]).toEqual({
      title: "Stack it",
      link: "https://www.youtube.com/watch?v=abc",
      materials: [],
      description: "",
    });
    expect(pack.tiles.head![300]).toEqual({ title: "Staring contest", players: 1, adminInfo: "" });
    expect(pack.tiles.wheel![100]).toEqual({ category: "Family", phrase: "GRANDMA'S HOUSE" });
    expect(pack.tiles.closest![100]).toEqual({ prompt: "Grandpa's age", answer: 88, rule: "noOver" });
  });

  it("validates the party games too", () => {
    const pack = parsePack("party", {
      columns: [
        col("act", [{ round: 1, value: 100, mode: "describe", word: "Uncle Bob", taboo: ["Uncle"] }]),
        col("charades", [{ round: 1, value: 100, category: "Cousins", words: ["Sam", "Ali"] }]),
        col("scavenger", [{ round: 1, value: 100, item: "A family photo", seconds: 45 }]),
        col("order", [{ round: 1, value: 100, prompt: "Kids", direction: "oldest first", items: ["Amy", "Ben"] }]),
      ],
    });
    expect(pack.errors).toEqual([]);
    expect(Object.keys(pack.tiles).sort()).toEqual(["act", "charades", "order", "scavenger"]);
  });

  it("lets a column's tiles play as other games (\"type\")", () => {
    const pack = parsePack("p", {
      columns: [
        col("head", [
          { round: 1, value: 100, title: "Staring contest", players: 1 },
          { round: 1, value: 200, type: "scavenger", item: "A rosary" },
          { round: 1, value: 300, type: "minute", title: "Stack Attack" },
          { round: 2, value: 200, type: "scavenger", item: "A Bible" },
        ]),
      ],
    });
    expect(pack.errors).toEqual([]);
    expect(pack.columns).toEqual([
      { title: "Head to Head", game: "head", tiles: { 200: "scavenger", 300: "minute", 101: "scavenger" } },
    ]);
    expect(pack.tiles.head![100]).toEqual({ title: "Staring contest", players: 1, adminInfo: "" });
    expect(pack.tiles.scavenger).toEqual({ 200: { item: "A rosary" }, 101: { item: "A Bible" } });
    // A Minute challenge without a video is title only.
    expect(pack.tiles.minute![300]).toEqual({ title: "Stack Attack", link: "", materials: [], description: "" });
  });

  it("refuses mixed tiles that would collide", () => {
    const pack = parsePack("p", {
      columns: [
        col("head", [
          { round: 1, value: 100, type: "feud", prompt: "x", answers: [{ answer: "a", points: 1 }] },
          { round: 1, value: 200, type: "scavenger", item: "A" },
          { round: 1, value: 200, title: "Same tile", players: 1 },
          { round: 1, value: 300, type: "trivia" },
        ]),
        col("act", [{ round: 1, value: 200, type: "scavenger", item: "B" }]),
        col("feud"),
      ],
    });
    expect(pack.errors).toEqual([
      expect.stringContaining('"type": "feud" can\'t be used here because feud has its own column'),
      expect.stringContaining("round 1 200 is already used by an earlier question"),
      expect.stringContaining('"type" must be one of'),
      expect.stringContaining("round 1 200 as scavenger clashes with another column's scavenger tile"),
    ]);
  });

  it("allows a column with no questions (all normal questions)", () => {
    const pack = parsePack("p", { columns: [col("head")] });
    expect(pack.errors).toEqual([]);
    expect(pack.columns).toEqual([{ title: "Head to Head", game: "head" }]);
    expect(pack.tiles.head).toBeUndefined();
  });

  it("skips bad questions with a readable reason and keeps the good ones", () => {
    const pack = parsePack("oops", {
      columns: [
        col("feud", [
          { round: 1, value: 100, prompt: "Good", answers: [{ answer: "Yes", points: 1 }] },
          { round: 1, value: 100, prompt: "Same tile", answers: [{ answer: "No", points: 1 }] },
          { round: 3, value: 100, prompt: "Bad round", answers: [{ answer: "No", points: 1 }] },
          { round: 1, value: 200, prompt: "No answers", answers: [] },
        ]),
        col("millionaire", [{ round: 1, value: 100, questions: ladder.slice(0, 2) }]),
        col("minute", [{ round: 1, value: 100, title: "Bad link", link: "https://example.com/video" }]),
        col("order", [{ round: 1, value: 100, prompt: "Dupes", direction: "x", items: ["A", "A"] }]),
      ],
    });
    expect(Object.keys(pack.tiles.feud!)).toEqual(["100"]);
    expect(pack.tiles.millionaire).toBeUndefined();
    expect(pack.columns.map((c) => c.game)).toEqual(["feud", "millionaire", "minute", "order"]);
    expect(pack.errors).toEqual([
      expect.stringContaining("columns[0] (feud) questions[1]: round 1 100 is already used"),
      expect.stringContaining("columns[0] (feud) questions[2]: needs round 1"),
      expect.stringContaining("columns[0] (feud) questions[3]: needs answers"),
      expect.stringContaining("columns[1] (millionaire) questions[0]: needs exactly 3 questions"),
      expect.stringContaining("columns[2] (minute) questions[0]: link must look like"),
      expect.stringContaining("columns[3] (order) questions[0]: needs 2 or more different items"),
    ]);
  });

  it("rejects duplicate game types, unknown games, and more than 6 columns", () => {
    const pack = parsePack("p", {
      columns: [col("feud"), col("feud", undefined, "Jones Feud"), col("trivia"), col("head"), col("wheel"), col("act"), col("order"), col("closest")],
    });
    expect(pack.columns.map((c) => c.game)).toEqual(["feud", "head", "wheel", "act"]);
    expect(pack.errors).toEqual([
      expect.stringContaining("8 columns: only the first 6"),
      expect.stringContaining("columns[1]: feud is already a column"),
      expect.stringContaining('columns[2]: "game" must be one of'),
    ]);
  });

  it("explains the old format and multi-page boards", () => {
    const pack = parsePack("old", {
      pages: [],
      feud: [{ round: 1, value: 100, prompt: "x", answers: [{ answer: "y", points: 1 }] }],
      trivia: [],
    });
    expect(pack.columns).toEqual([]);
    expect(pack.errors).toEqual([
      expect.stringContaining('"pages": a custom pack is one page'),
      expect.stringContaining('"feud": questions now go inside a column'),
      expect.stringContaining('"trivia" isn\'t part of the format'),
      expect.stringContaining('needs "columns"'),
    ]);
  });

  it("gives the lobby a title screen: the pack's name by default, or its own", () => {
    expect(parsePack("p", { name: "Smith night", columns: [col("head")] }).titleScreen).toEqual({
      title: "Smith night",
    });
    const custom = parsePack("p", {
      name: "Smith night",
      title: "The Smith Games",
      subtitle: "Welcome, family!",
      columns: [col("head")],
    });
    expect(custom.errors).toEqual([]);
    expect(custom.titleScreen).toEqual({ title: "The Smith Games", subtitle: "Welcome, family!" });
  });

  it("checks title screen text", () => {
    const pack = parsePack("p", { title: "x".repeat(70), subtitle: 5, columns: [col("head")] });
    expect(pack.titleScreen).toEqual({ title: "x".repeat(60) });
    expect(pack.errors).toEqual([
      expect.stringContaining('"title" is over 60 characters'),
      expect.stringContaining('"subtitle" must be text'),
    ]);
  });

  it("takes a title screen decor, ignoring unknown ones", () => {
    const pack = parsePack("p", { title: "T", decor: "catholic-icons", columns: [col("head")] });
    expect(pack.errors).toEqual([]);
    expect(pack.titleScreen).toEqual({ title: "T", decor: "catholic-icons" });
    const bad = parsePack("p", { title: "T", decor: "sparkles", columns: [col("head")] });
    expect(bad.titleScreen).toEqual({ title: "T" });
    expect(bad.errors).toEqual([expect.stringContaining('"decor" must be one of')]);
  });

  it("sizes the board by rows (default 5) and rejects tiles that aren't on it", () => {
    expect(parsePack("p", { columns: [col("head")] }).rows).toBe(5);
    const pack = parsePack("p", {
      rows: 4,
      columns: [
        col("feud", [
          { round: 1, value: 400, prompt: "On the board", answers: [{ answer: "A", points: 1 }] },
          { round: 1, value: 500, prompt: "Off the board", answers: [{ answer: "A", points: 1 }] },
          { round: 2, value: 800, prompt: "On the board", answers: [{ answer: "A", points: 1 }] },
          { round: 2, value: 1000, prompt: "Off the board", answers: [{ answer: "A", points: 1 }] },
        ]),
      ],
    });
    expect(pack.rows).toBe(4);
    expect(Object.keys(pack.tiles.feud!).sort()).toEqual(["400", "401"]);
    expect(pack.errors).toEqual([
      expect.stringContaining("round 1 500 isn't on this 4-row board (round 1 goes up to 400, round 2 up to 800)"),
      expect.stringContaining("round 2 1000 isn't on this 4-row board"),
    ]);
  });

  it("can switch Double Jeopardy off: round 2 questions are then reported unused", () => {
    expect(parsePack("p", { columns: [col("head")] }).doubleJeopardy).toBe(true);
    const pack = parsePack("p", {
      doubleJeopardy: false,
      columns: [
        col("feud", [
          { round: 1, value: 100, prompt: "Played", answers: [{ answer: "A", points: 1 }] },
          { round: 2, value: 200, prompt: "Never played", answers: [{ answer: "A", points: 1 }] },
        ]),
      ],
    });
    expect(pack.doubleJeopardy).toBe(false);
    expect(Object.keys(pack.tiles.feud!)).toEqual(["100"]);
    expect(pack.errors).toEqual([expect.stringContaining('round 2 isn\'t played ("doubleJeopardy": false)')]);
    expect(parsePack("p", { doubleJeopardy: "no", columns: [col("head")] }).errors).toEqual([
      expect.stringContaining('"doubleJeopardy" must be true or false'),
    ]);
  });

  it("rejects a bad rows value and keeps 5", () => {
    for (const rows of [0, 6, 2.5, "4"]) {
      const pack = parsePack("p", { rows, columns: [col("head")] });
      expect(pack.rows).toBe(5);
      expect(pack.errors).toEqual([expect.stringContaining('"rows" must be a whole number from 1 to 5')]);
    }
  });

  it("reports a file that isn't an object", () => {
    expect(parsePack("x", []).errors).toEqual(["the file must be a JSON object"]);
  });
});

describe("packBoard", () => {
  it("is one custom page named after the pack", () => {
    const pack = parsePack("p", { name: "Smith night", columns: [col("feud", undefined, "Smith Feud")] });
    expect(packBoard(pack)).toEqual([
      {
        id: "custom",
        label: "Smith night",
        columns: [{ title: "Smith Feud", game: "feud" }],
        values: [100, 200, 300, 400, 500],
      },
    ]);
  });

  it("carries a smaller board's tile values", () => {
    const pack = parsePack("p", { rows: 4, columns: [col("feud")] });
    expect(packBoard(pack)[0].values).toEqual([100, 200, 300, 400]);
  });
});

describe("applyPack", () => {
  it("replaces only the pack's tiles and leaves the rest of the board alone", () => {
    const base = {
      feud: { 100: { prompt: "normal 100" }, 200: { prompt: "normal 200" } },
      minute: { 100: { title: "normal" } },
      millionaire: {},
      head: {},
    } as unknown as GameData;
    const pack = parsePack("p", {
      columns: [
        col("feud", [{ round: 1, value: 200, prompt: "custom", answers: [{ answer: "A", points: 1 }] }]),
        col("wheel", [{ round: 2, value: 200, category: "C", phrase: "HI" }]),
      ],
    });
    const result = applyPack(base, pack) as any;
    expect(result.feud[100].prompt).toBe("normal 100");
    expect(result.feud[200].prompt).toBe("custom");
    expect(result.minute).toBe(base.minute);
    expect(result.wheel[101]).toEqual({ category: "C", phrase: "HI" });
    expect((base as any).feud[200].prompt).toBe("normal 200"); // input untouched
  });
});

describe("the pack template (src/data/custom/template.json)", () => {
  it("is a valid six-column board, including a column with no questions", () => {
    const pack = loadPack("template")!;
    expect(pack.errors).toEqual([]);
    expect(pack.columns.map((c) => c.game)).toEqual(["feud", "millionaire", "wheel", "closest", "order", "head"]);
    expect(pack.tiles.head).toBeUndefined();
    expect(Object.keys(pack.tiles.feud!)).toEqual(["100", "201"]); // a round 1 and a round 2 tile
  });

  it("is offered in the create-game dropdown", () => {
    expect(listPacks()).toContainEqual({ id: "template", name: "Template (copy me)" });
  });
});
