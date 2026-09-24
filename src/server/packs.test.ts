import { applyPack, listPacks, loadPack, parsePack, slotKeyFor } from "./packs";
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

describe("parsePack", () => {
  it("loads valid entries for every game, stripping round/value", () => {
    const pack = parsePack("family", {
      name: "Family night",
      feud: [{ round: 1, value: 100, prompt: "Name a pet", answers: [{ answer: "Dog", points: 50 }] }],
      millionaire: [{ round: 2, value: 400, questions: ladder }],
      minute: [{ round: 1, value: 200, title: "Stack it", link: "https://www.youtube.com/watch?v=abc" }],
      head: [{ round: 1, value: 300, title: "Staring contest", players: 1 }],
      wheel: [{ round: 1, value: 100, category: "Family", phrase: "Grandma's house" }],
      act: [{ round: 1, value: 100, mode: "describe", word: "Uncle Bob", taboo: ["Uncle"] }],
      charades: [{ round: 1, value: 100, category: "Cousins", words: ["Sam", "Ali"] }],
      scavenger: [{ round: 1, value: 100, item: "A family photo", seconds: 45 }],
      closest: [{ round: 1, value: 100, prompt: "Grandpa's age", answer: 88, rule: "noOver" }],
      order: [{ round: 1, value: 100, prompt: "Kids", direction: "oldest first", items: ["Amy", "Ben"] }],
    });
    expect(pack.errors).toEqual([]);
    expect(pack.name).toBe("Family night");
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

  it("skips bad entries with a readable reason and keeps the good ones", () => {
    const pack = parsePack("oops", {
      feud: [
        { round: 1, value: 100, prompt: "Good", answers: [{ answer: "Yes", points: 1 }] },
        { round: 1, value: 100, prompt: "Same tile", answers: [{ answer: "No", points: 1 }] },
        { round: 3, value: 100, prompt: "Bad round", answers: [{ answer: "No", points: 1 }] },
        { round: 1, value: 200, prompt: "No answers", answers: [] },
      ],
      millionaire: [{ round: 1, value: 100, questions: ladder.slice(0, 2) }],
      minute: [{ round: 1, value: 100, title: "No link" }],
      order: [{ round: 1, value: 100, prompt: "Dupes", direction: "x", items: ["A", "A"] }],
      trivia: [],
    });
    expect(Object.keys(pack.tiles.feud!)).toEqual(["100"]);
    expect(pack.tiles.millionaire).toBeUndefined();
    expect(pack.errors).toEqual([
      expect.stringContaining('"trivia" isn\'t a game'),
      expect.stringContaining("feud[1]: round 1 100 is already used"),
      expect.stringContaining("feud[2]: needs round 1"),
      expect.stringContaining("feud[3]: needs answers"),
      expect.stringContaining("millionaire[0]: needs exactly 3 questions"),
      expect.stringContaining("minute[0]: needs a link"),
      expect.stringContaining("order[0]: needs 2 or more different items"),
    ]);
  });

  it("reports a file that isn't an object", () => {
    expect(parsePack("x", []).errors).toEqual(["the file must be a JSON object"]);
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
      feud: [{ round: 1, value: 200, prompt: "custom", answers: [{ answer: "A", points: 1 }] }],
      wheel: [{ round: 2, value: 200, category: "C", phrase: "HI" }],
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
  it("is valid and fills one tile in every game", () => {
    const pack = loadPack("template")!;
    expect(pack.errors).toEqual([]);
    expect(Object.keys(pack.tiles).sort()).toEqual(
      ["act", "charades", "closest", "feud", "head", "millionaire", "minute", "order", "scavenger", "wheel"]
    );
  });

  it("is offered in the create-game dropdown", () => {
    expect(listPacks()).toContainEqual({ id: "template", name: "Template (copy me)" });
  });
});
