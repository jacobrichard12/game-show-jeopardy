import { GameName, GameState } from "../shared/types";
import { questionPreview } from "./questionPreview";

// A state on the $100 tile of `game`, with that game's bank holding `q`.
const on = (game: GameName, q: unknown, column?: string): GameState =>
  ({
    isDoubleJeopardy: false,
    gameData: { [game]: { 100: q } },
    currentGame: { gameName: game, gameTitle: "", value: 100, questionState: { promptVisible: false }, column },
  } as unknown as GameState);

describe("questionPreview (the host's Up next line)", () => {
  it("gives a one-line peek for every game", () => {
    expect(questionPreview(on(GameName.FAMILY_FEUD, { prompt: "Name a sacrament", answers: [] }))).toBe("Name a sacrament");
    expect(
      questionPreview(on(GameName.MILLIONAIRE, { questions: [{ question: "Who was the first Pope?" }, { question: "x" }] }))
    ).toBe("Who was the first Pope?");
    expect(questionPreview(on(GameName.MINUTE, { title: "Spin Doctor" }))).toBe("Spin Doctor");
    expect(questionPreview(on(GameName.MINUTE, { title: "Spin Doctor" }, "head"))).toBe("Minute to win it: Spin Doctor");
    expect(questionPreview(on(GameName.HEAD_TO_HEAD, { title: "Thumb War" }))).toBe("Thumb War");
    expect(questionPreview(on(GameName.WHEEL, { category: "Prayer", phrase: "HAIL MARY" }))).toBe("Prayer: HAIL MARY");
    expect(questionPreview(on(GameName.ACT, { mode: "draw", word: "Noah's Ark" }))).toBe("Draw: Noah's Ark");
    expect(questionPreview(on(GameName.CHARADES, { category: "Saints", words: [] }))).toBe("Saints");
    expect(questionPreview(on(GameName.SCAVENGER, { item: "A rosary" }))).toBe("A rosary");
    expect(questionPreview(on(GameName.SCAVENGER, { item: "A rosary" }, "head"))).toBe("Scavenger Sprint: A rosary");
    expect(questionPreview(on(GameName.CLOSEST, { prompt: "How many books?", answer: 73 }))).toBe("How many books?");
    expect(questionPreview(on(GameName.ORDER, { prompt: "Holy Week", items: [] }))).toBe("Holy Week");
  });

  it("is empty when the tile has no question", () => {
    expect(questionPreview(on(GameName.FAMILY_FEUD, undefined))).toBeUndefined();
  });
});
