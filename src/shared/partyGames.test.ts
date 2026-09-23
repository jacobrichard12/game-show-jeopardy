import {
  bestTeams,
  charadesWord,
  computeClosestResult,
  countRevealedLetters,
  createClock,
  createInitialQuestionState,
  isPhraseComplete,
  isTeamOrderComplete,
  nextTeamId,
  normalizeTeamOrder,
  phraseHasLetter,
  placeOrderItem,
  removeOrderItem,
  scoreTeamOrder,
  scrambledOrder,
  seededShuffle,
  setClockSeconds,
  startClock,
  updateQuestionState,
  wheelWords,
} from "./partyGames";
import {
  CharadesQuestionState,
  ClosestQuestionState,
  createDefaultTeams,
  GameName,
  GameState,
  OrderQuestionState,
  PerformQuestionState,
  ScavengerQuestionState,
  WheelQuestionState,
} from "./types";

describe("Put It In Order: team answer", () => {
  it("normalizes to one slot per item", () => {
    expect(normalizeTeamOrder([], 3)).toEqual([null, null, null]);
    expect(normalizeTeamOrder(undefined, 2)).toEqual([null, null]);
    expect(normalizeTeamOrder(["a", null, "c", "d"], 3)).toEqual(["a", null, "c"]);
  });

  it("places a pool item into an empty slot without mutating", () => {
    const order = [null, null, null];
    expect(placeOrderItem(order, "a", 1)).toEqual([null, "a", null]);
    expect(order).toEqual([null, null, null]);
  });

  it("a pool item placed on an occupied slot sends the occupant back to the pool", () => {
    expect(placeOrderItem(["a", null, null], "b", 0)).toEqual(["b", null, null]);
  });

  it("moves an item between slots, swapping with any occupant", () => {
    expect(placeOrderItem(["a", null, null], "a", 2)).toEqual([null, null, "a"]);
    expect(placeOrderItem(["a", "b", null], "a", 1)).toEqual(["b", "a", null]);
    expect(placeOrderItem(["a", "b", null], "a", 0)).toEqual(["a", "b", null]);
  });

  it("ignores out-of-range slots", () => {
    expect(placeOrderItem([null], "a", 3)).toEqual([null]);
  });

  it("removes an item back to the pool", () => {
    expect(removeOrderItem(["a", "b", null], "a")).toEqual([null, "b", null]);
  });

  it("is complete only when every slot is filled", () => {
    expect(isTeamOrderComplete([])).toBe(false);
    expect(isTeamOrderComplete(["a", null])).toBe(false);
    expect(isTeamOrderComplete(["a", "b"])).toBe(true);
  });

  it("scores each slot against the correct order", () => {
    expect(scoreTeamOrder(["a", "b", "c"], ["a", "b", "c"])).toEqual({
      slotCorrect: [true, true, true],
      correctCount: 3,
      total: 3,
      allCorrect: true,
    });
    expect(scoreTeamOrder(["a", "c", "b"], ["a", "b", "c"])).toEqual({
      slotCorrect: [true, false, false],
      correctCount: 1,
      total: 3,
      allCorrect: false,
    });
  });
});

describe("seededShuffle / scrambledOrder", () => {
  const items = ["a", "b", "c", "d", "e"];

  it("is deterministic for a given seed (host and TV agree)", () => {
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42));
  });

  it("returns a permutation without touching the input", () => {
    const copy = [...items];
    const shuffled = seededShuffle(items, 7);
    expect(shuffled.slice().sort()).toEqual(copy);
    expect(items).toEqual(copy);
  });

  it("different seeds can give different orders", () => {
    const orders = new Set(
      Array.from({ length: 20 }, (_, seed) => seededShuffle(items, seed).join(""))
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("never hands back the already-solved order", () => {
    for (let seed = 0; seed < 300; seed++) {
      expect(scrambledOrder(items, seed)).not.toEqual(items);
    }
  });

  it("leaves a single item alone", () => {
    expect(scrambledOrder(["only"], 1)).toEqual(["only"]);
  });
});

describe("wheel helpers", () => {
  it("phraseHasLetter is case-insensitive", () => {
    expect(phraseHasLetter("Piece of cake", "p")).toBe(true);
    expect(phraseHasLetter("Piece of cake", "Z")).toBe(false);
  });

  it("wheelWords groups by word and hides unguessed letters", () => {
    const words = wheelWords("HI YOU", ["H", "O"], false);
    expect(words).toHaveLength(2);
    expect(words[0].map((t) => t.show)).toEqual([true, false]); // H shown, I hidden
    expect(words[1].map((t) => t.show)).toEqual([false, true, false]); // O shown
  });

  it("always shows punctuation, and shows everything once solved", () => {
    const [word] = wheelWords("DON'T", [], false);
    expect(word.find((t) => t.char === "'")).toEqual({ char: "'", isLetter: false, show: true });
    expect(word.filter((t) => t.isLetter).every((t) => !t.show)).toBe(true);
    expect(wheelWords("DON'T", [], true)[0].every((t) => t.show)).toBe(true);
  });

  it("collapses repeated spaces", () => {
    expect(wheelWords("A  B", [], false)).toHaveLength(2);
  });

  it("isPhraseComplete needs every letter, ignoring punctuation and spaces", () => {
    expect(isPhraseComplete("A B!", ["A"])).toBe(false);
    expect(isPhraseComplete("A B!", ["A", "B"])).toBe(true);
  });

  it("countRevealedLetters counts every copy of a guessed letter", () => {
    expect(countRevealedLetters("BANANA", ["A"])).toBe(3);
    expect(countRevealedLetters("BANANA", ["A", "N"])).toBe(5);
    expect(countRevealedLetters("BANANA", ["Z"])).toBe(0);
  });
});

describe("computeClosestResult", () => {
  it("picks the closest guess", () => {
    const result = computeClosestResult(100, { a: 90, b: 130, c: 105 });
    expect(result.winners).toEqual(["c"]);
    expect(result.distances).toEqual({ a: 10, b: 30, c: 5 });
  });

  it("lets ties all win", () => {
    expect(computeClosestResult(100, { a: 95, b: 105, c: 50 }).winners.sort()).toEqual(["a", "b"]);
  });

  it("ignores teams with no guess", () => {
    const result = computeClosestResult(10, { a: null, b: 4 });
    expect(result.winners).toEqual(["b"]);
    expect(result.distances.a).toBeNull();
    expect(result.eligible.a).toBe(false);
  });

  it("gives nobody the win when no one has a guess", () => {
    expect(computeClosestResult(10, { a: null, b: null }).winners).toEqual([]);
  });

  it("noOver disqualifies guesses above the answer", () => {
    const result = computeClosestResult(100, { a: 101, b: 60 }, "noOver");
    expect(result.winners).toEqual(["b"]);
    expect(result.eligible.a).toBe(false);
  });

  it("noOver with everyone over means nobody wins", () => {
    expect(computeClosestResult(100, { a: 150, b: 200 }, "noOver").winners).toEqual([]);
  });

  it("noOver lets an exact guess win", () => {
    expect(computeClosestResult(100, { a: 100, b: 99 }, "noOver").winners).toEqual(["a"]);
  });
});

describe("bestTeams", () => {
  it("returns the team(s) with the highest count", () => {
    expect(bestTeams({ a: 2, b: 4, c: 4 }).sort()).toEqual(["b", "c"]);
  });

  it("ignores teams with no count yet", () => {
    expect(bestTeams({ a: null, b: 3 })).toEqual(["b"]);
  });

  it("returns nobody when nobody scored or nothing is entered", () => {
    expect(bestTeams({ a: 0, b: 0 })).toEqual([]);
    expect(bestTeams({ a: null, b: null })).toEqual([]);
    expect(bestTeams({})).toEqual([]);
  });
});

describe("nextTeamId", () => {
  const teams = createDefaultTeams(3);

  it("advances in seat order and wraps", () => {
    expect(nextTeamId(teams, "team-1")).toBe("team-2");
    expect(nextTeamId(teams, "team-3")).toBe("team-1");
  });

  it("starts from the first team when there's no current team", () => {
    expect(nextTeamId(teams, undefined)).toBe("team-1");
  });
});

describe("updateQuestionState", () => {
  const base = {
    teams: createDefaultTeams(2),
    currentGame: {
      gameName: GameName.WHEEL,
      gameTitle: "Wheel Puzzle",
      value: 100,
      questionState: { promptVisible: false, guessedLetters: [], solved: false },
    },
  } as unknown as GameState;

  it("merges the patch into a new state and leaves the old one alone", () => {
    const next = updateQuestionState<WheelQuestionState>(base, { guessedLetters: ["A"] });
    expect(next.currentGame.questionState).toEqual({
      promptVisible: false,
      guessedLetters: ["A"],
      solved: false,
    });
    expect(next).not.toBe(base);
    expect((base.currentGame.questionState as WheelQuestionState).guessedLetters).toEqual([]);
  });
});

describe("createClock", () => {
  it("starts paused with the full duration", () => {
    expect(createClock(45)).toEqual({ durationMs: 45000, remainingMs: 45000, running: false, runId: 0 });
  });
});

describe("setClockSeconds / startClock", () => {
  const clock = { durationMs: 60000, remainingMs: 12000, running: true, runId: 3 };

  it("resets and pauses at the new length, bumping runId", () => {
    expect(setClockSeconds(clock, 90)).toEqual({
      durationMs: 90000,
      remainingMs: 90000,
      running: false,
      runId: 4,
    });
  });

  it("keeps the length within bounds", () => {
    expect(setClockSeconds(clock, 0).durationMs).toBe(5000);
    expect(setClockSeconds(clock, 99999).durationMs).toBe(600000);
    expect(setClockSeconds(clock, 12.4).durationMs).toBe(12000);
  });

  it("startClock runs from the time left", () => {
    const paused = { ...clock, running: false };
    expect(startClock(paused)).toEqual({ ...paused, running: true, runId: 4 });
  });
});

describe("charadesWord", () => {
  it("wraps around the list", () => {
    const words = ["a", "b", "c"];
    expect(charadesWord(words, 0)).toBe("a");
    expect(charadesWord(words, 4)).toBe("b");
    expect(charadesWord([], 2)).toBe("");
  });
});

describe("createInitialQuestionState", () => {
  const teams = createDefaultTeams(3);

  it("wheel starts with no guesses", () => {
    expect(createInitialQuestionState(GameName.WHEEL, teams)).toEqual({
      promptVisible: false,
      guessedLetters: [],
      solved: false,
      wrongGuesses: 0,
    });
  });

  it("scavenger starts with the item hidden", () => {
    const state = createInitialQuestionState(GameName.SCAVENGER, teams) as ScavengerQuestionState;
    expect(state.itemRevealed).toBe(false);
    expect(state.clock.running).toBe(false);
  });

  it("act/scavenger use the default clock, or the bank's override", () => {
    const def = createInitialQuestionState(GameName.ACT, teams) as PerformQuestionState;
    expect(def.clock.durationMs).toBe(60000);
    expect(def.wordRevealed).toBe(false);
    const custom = createInitialQuestionState(GameName.SCAVENGER, teams, { seconds: 90 }) as PerformQuestionState;
    expect(custom.clock.durationMs).toBe(90000);
  });

  it("closest starts with a null guess for every team", () => {
    const state = createInitialQuestionState(GameName.CLOSEST, teams) as ClosestQuestionState;
    expect(state.guesses).toEqual({ "team-1": null, "team-2": null, "team-3": null });
    expect(state.revealed).toBe(false);
  });

  it("order starts unrevealed with a seed", () => {
    const state = createInitialQuestionState(GameName.ORDER, teams) as OrderQuestionState;
    expect(typeof state.seed).toBe("number");
    expect(state.revealedCount).toBe(0);
    expect(state.teamOrder).toEqual([]);
    expect(state.checked).toBe(false);
    expect(state.checkCount).toBe(0);
  });

  it("charades starts with no active team, a null score per team, and the bank's clock", () => {
    const state = createInitialQuestionState(GameName.CHARADES, teams, {
      seconds: 45,
    }) as CharadesQuestionState;
    expect(state.activeTeamId).toBeNull();
    expect(state.wordIndex).toBe(0);
    expect(state.scores).toEqual({ "team-1": null, "team-2": null, "team-3": null });
    expect(state.clock.durationMs).toBe(45000);
  });

  it("the original games mirror what the host panel builds today", () => {
    expect(createInitialQuestionState(GameName.FAMILY_FEUD, teams)).toEqual({
      promptVisible: false,
      showFeudPrompt: false,
      revealedAnswers: [],
      wrongGuesses: 0,
    });
    expect(createInitialQuestionState(GameName.MINUTE, teams)).toEqual({ promptVisible: false });
    expect(createInitialQuestionState(GameName.HEAD_TO_HEAD, teams)).toEqual({
      promptVisible: false,
      showTitle: false,
    });
    expect(createInitialQuestionState(GameName.MILLIONAIRE, teams)).toEqual({
      promptVisible: false,
      questionIdx: 0,
      revealedAnswers: 0,
    });
  });

  it("other games get just the base state", () => {
    expect(createInitialQuestionState(GameName.BOARD, teams)).toEqual({ promptVisible: false });
  });
});
