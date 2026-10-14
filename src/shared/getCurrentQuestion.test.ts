import { GameName, GameState, getCurrentQuestion, mixedTileKey } from "./types";

const at = (value: number, extra: Partial<GameState["currentGame"]> = {}, dj = false): GameState =>
  ({
    isDoubleJeopardy: dj,
    currentGame: { gameName: GameName.CHARADES, gameTitle: "", value, questionState: { promptVisible: false }, ...extra },
  } as unknown as GameState);

describe("getCurrentQuestion", () => {
  const bank = { 400: "own column", [mixedTileKey("head", 400)]: "head's tile", 501: "dj" };

  it("reads the slot for the tile (Double Jeopardy halves it)", () => {
    expect(getCurrentQuestion(bank, at(400))).toBe("own column");
    expect(getCurrentQuestion(bank, at(1000, {}, true))).toBe("dj");
  });

  it("gives a mixed tile its own column's question, else the plain slot", () => {
    expect(getCurrentQuestion(bank, at(400, { column: "head" }))).toBe("head's tile");
    expect(getCurrentQuestion(bank, at(400, { column: "act" }))).toBe("own column");
  });
});
