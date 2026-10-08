import {
  boardPages,
  currentBoardPage,
  customColumnTitle,
  isCustomBoard,
  standardColumnTitle,
  STANDARD_PAGES,
} from "./boardLayout";

const customBoard = [
  { id: "custom", label: "Smith night", columns: [{ title: "Smith Family Feud", game: "feud" }] },
];

describe("board layouts", () => {
  it("uses the Standard board (Classic + Party, today's columns) without a custom one", () => {
    expect(boardPages({})).toBe(STANDARD_PAGES);
    expect(STANDARD_PAGES.map((p) => [p.id, p.label, p.columns.map((c) => c.game)])).toEqual([
      ["classic", "Classic Games", ["feud", "millionaire", "minute", "head"]],
      ["party", "Party Games", ["wheel", "act", "charades", "scavenger", "closest", "order"]],
    ]);
    expect(isCustomBoard({})).toBe(false);
  });

  it("picks the current page, falling back to the first", () => {
    expect(currentBoardPage({ boardPage: "party" }).id).toBe("party");
    expect(currentBoardPage({}).id).toBe("classic");
    expect(currentBoardPage({ boardPage: "nope" }).id).toBe("classic");
    expect(currentBoardPage({ board: customBoard }).id).toBe("custom");
  });

  it("gives column titles: custom boards only, and Standard defaults", () => {
    expect(customColumnTitle({ board: customBoard }, "feud")).toBe("Smith Family Feud");
    expect(customColumnTitle({}, "feud")).toBeUndefined(); // Standard keeps its titles
    expect(standardColumnTitle("millionaire")).toBe("Who Wants to be a Millionaire");
    expect(standardColumnTitle("nope")).toBeUndefined();
  });
});
