import headToHeadBank from "../data/headToHeadBank.json";
import minuteBank from "../data/minuteBank.json";
import partyGames from "../data/partyGames.json";
import sandboxFeud from "../data/sandbox/feud.json";
import sandboxHead from "../data/sandbox/head.json";
import sandboxMillionaire from "../data/sandbox/millionaire.json";
import sandboxMinute from "../data/sandbox/minute.json";
import sandboxParty from "../data/sandbox/party.json";
import { ALPHABET } from "./partyGames";
import { buildMillionaireQuestions, buildSlotBank, DIFFICULTY_SLOTS, DifficultyBank, shuffleArray } from "./slots";
import { Difficulty } from "./types";

describe("buildSlotBank", () => {
  const source: DifficultyBank<string> = {
    [Difficulty.easy]: ["e1", "e2", "e3", "e4", "e5"],
    [Difficulty.medium]: ["m1", "m2", "m3", "m4"],
    [Difficulty.hard]: ["h1", "h2", "h3"],
  };

  it("fills exactly the board's slots", () => {
    const bank = buildSlotBank(source);
    expect(Object.keys(bank).map(Number).sort((a, b) => a - b)).toEqual([
      100, 101, 200, 201, 300, 301, 400, 401, 500, 501,
    ]);
  });

  it("puts each difficulty's items only in that difficulty's slots, without repeats", () => {
    const bank = buildSlotBank(source);
    DIFFICULTY_SLOTS[Difficulty.easy].forEach((slot) => expect(bank[slot]).toMatch(/^e/));
    DIFFICULTY_SLOTS[Difficulty.medium].forEach((slot) => expect(bank[slot]).toMatch(/^m/));
    DIFFICULTY_SLOTS[Difficulty.hard].forEach((slot) => expect(bank[slot]).toMatch(/^h/));
    const values = Object.values(bank);
    expect(new Set(values).size).toBe(values.length);
  });

  it("leaves slots empty when a difficulty is short (no undefined entries)", () => {
    const bank = buildSlotBank({ ...source, [Difficulty.hard]: ["h1"] });
    expect(bank[500]).toBeDefined();
    expect(bank[501]).toBeUndefined();
    expect(Object.values(bank).every((v) => v !== undefined)).toBe(true);
  });

  it("copes with a missing difficulty", () => {
    const bank = buildSlotBank({ [Difficulty.easy]: ["e1"] } as unknown as DifficultyBank<string>);
    expect(Object.keys(bank)).toEqual(["100"]);
  });
});

describe("shuffleArray", () => {
  it("keeps the same items and doesn't mutate the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffleArray(input);
    expect(out.slice().sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

// Guards the starter content in src/data/partyGames.json, so an edit that
// leaves a tile without a question (or breaks a game's assumptions) fails here
// rather than at game time.
describe("partyGames.json content", () => {
  const banks = partyGames as unknown as Record<string, DifficultyBank<any>>;
  const games = Object.keys(banks);

  it("covers all six party games", () => {
    expect(games.sort()).toEqual(["act", "charades", "closest", "order", "scavenger", "wheel"]);
  });

  it.each(games)("%s has enough entries for every board slot", (game) => {
    Object.values(Difficulty).forEach((difficulty) => {
      expect(banks[game][difficulty].length).toBeGreaterThanOrEqual(DIFFICULTY_SLOTS[difficulty].length);
    });
  });

  const all = (game: string): any[] => Object.values(Difficulty).flatMap((d) => banks[game][d]);

  it("wheel phrases are uppercase-able words with a category", () => {
    all("wheel").forEach((p) => {
      expect(p.category.length).toBeGreaterThan(0);
      expect(p.phrase).toBe(p.phrase.toUpperCase());
      expect(p.phrase.split("").some((c: string) => ALPHABET.includes(c))).toBe(true);
    });
  });

  it("act entries have a valid mode, and describe entries list off-limits words", () => {
    all("act").forEach((p) => {
      expect(["act", "draw", "describe"]).toContain(p.mode);
      expect(p.word.length).toBeGreaterThan(0);
      if (p.mode === "describe") expect(p.taboo?.length).toBeGreaterThan(0);
    });
  });

  it("closest answers are finite numbers with a valid rule", () => {
    all("closest").forEach((q) => {
      expect(Number.isFinite(q.answer)).toBe(true);
      expect(["closest", "noOver", undefined]).toContain(q.rule);
    });
  });

  it("charades entries have a category and enough unique words for a few turns", () => {
    all("charades").forEach((p) => {
      expect(p.category.length).toBeGreaterThan(0);
      expect(p.words.length).toBeGreaterThanOrEqual(10);
      expect(new Set(p.words).size).toBe(p.words.length);
    });
  });

  // Most act/charades words are imported from game-words
  // (scripts/game-words/); a word should appear only once per game.
  it.each([
    ["act", (p: any) => [p.word]],
    ["charades", (p: any) => p.words],
  ])("%s has no repeated words across its entries", (game, wordsOf) => {
    const words: string[] = all(game as string).flatMap(wordsOf as (p: any) => string[]);
    const keys = words.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""));
    expect(keys.filter((k, i) => keys.indexOf(k) !== i)).toEqual([]);
  });

  it("order puzzles have 3-10 unique items (the labels only go A-J)", () => {
    all("order").forEach((p) => {
      expect(p.items.length).toBeGreaterThanOrEqual(3);
      expect(p.items.length).toBeLessThanOrEqual(10);
      expect(new Set(p.items).size).toBe(p.items.length);
    });
  });
});

describe("buildMillionaireQuestions", () => {
  const sub = (name: string) => ({
    question: name,
    category: "c",
    answers: ["a", "b", "c", "d"],
    correctAnswerIdx: 0,
  });
  const many = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => sub(`${prefix}${i}`));
  const allSlots = [100, 101, 200, 201, 300, 301, 400, 401, 500, 501];

  it("gives every slot three questions, easy slots from the easy pool only", () => {
    const bank = buildMillionaireQuestions({ easy: many("e", 12), mediumHard: many("m", 18) });
    expect(Object.keys(bank).map(Number).sort((a, b) => a - b)).toEqual(allSlots);
    allSlots.forEach((slot) => expect(bank[slot].questions).toHaveLength(3));
    [100, 101, 200, 201].forEach((slot) =>
      bank[slot].questions.forEach((q) => expect(q.question).toMatch(/^e/))
    );
    [300, 301, 400, 401, 500, 501].forEach((slot) =>
      bank[slot].questions.forEach((q) => expect(q.question).toMatch(/^m/))
    );
  });

  it("uses each question once when the pool is big enough", () => {
    const bank = buildMillionaireQuestions({ easy: many("e", 12), mediumHard: many("m", 18) });
    const names = allSlots.flatMap((slot) => bank[slot].questions.map((q) => q.question));
    expect(new Set(names).size).toBe(names.length);
  });

  it("wraps a short pool instead of leaving undefined questions", () => {
    const bank = buildMillionaireQuestions({ easy: many("e", 2), mediumHard: many("m", 4) });
    allSlots.forEach((slot) => {
      expect(bank[slot].questions).toHaveLength(3);
      bank[slot].questions.forEach((q) => expect(q).toBeDefined());
    });
  });

  it("an empty pool leaves every slot with no questions (the game shows 'no question')", () => {
    const bank = buildMillionaireQuestions({ easy: [], mediumHard: [] });
    allSlots.forEach((slot) => expect(bank[slot].questions).toEqual([]));
  });
});

// The real Minute / Head to Head banks and the sandbox's bundled Feud and
// Millionaire samples must cover every board slot, or a tile shows "no
// question". Head to Head has exactly the minimum, so trimming it breaks this.
describe("bank coverage", () => {
  const enough = (bank: unknown) =>
    Object.values(Difficulty).forEach((d) =>
      expect((bank as DifficultyBank<unknown>)[d].length).toBeGreaterThanOrEqual(DIFFICULTY_SLOTS[d].length)
    );

  it("minuteBank.json covers every slot", () => enough(minuteBank));
  it("headToHeadBank.json covers every slot", () => enough(headToHeadBank));
  it("the sandbox Feud filler covers every slot", () => enough(sandboxFeud));
  it("the sandbox Minute and Head to Head filler cover every slot", () => {
    enough(sandboxMinute);
    enough(sandboxHead);
  });
  it("the sandbox party filler covers every slot", () =>
    Object.values(sandboxParty).forEach((bank) => enough(bank)));

  it("sandbox Feud questions are valid", () => {
    Object.values(Difficulty).forEach((d) =>
      (sandboxFeud as unknown as DifficultyBank<any>)[d].forEach((q) => {
        expect(q.prompt.trim().length).toBeGreaterThan(0);
        expect(q.answers.length).toBeGreaterThan(0);
        q.answers.forEach((a: any) => {
          expect(a.answer.trim().length).toBeGreaterThan(0);
          expect(a.points).toBeGreaterThan(0);
        });
      })
    );
  });

  it("the sandbox Millionaire sample has enough questions and valid answers", () => {
    const pool = sandboxMillionaire as unknown as { easy: any[]; mediumHard: any[] };
    expect(pool.easy.length).toBeGreaterThanOrEqual(12); // 4 easy slots x 3
    expect(pool.mediumHard.length).toBeGreaterThanOrEqual(18); // 6 slots x 3
    [...pool.easy, ...pool.mediumHard].forEach((q) => {
      expect(q.question.length).toBeGreaterThan(0);
      expect(q.answers).toHaveLength(4);
      expect(new Set(q.answers).size).toBe(4);
      expect(q.correctAnswerIdx).toBeGreaterThanOrEqual(0);
      expect(q.correctAnswerIdx).toBeLessThan(4);
    });
  });
});
