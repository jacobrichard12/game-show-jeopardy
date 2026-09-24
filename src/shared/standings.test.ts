import { getWinners, rankTeams } from "./standings";
import { TeamState } from "./types";

const team = (id: string, score: number): TeamState => ({ id, name: id, score });

describe("rankTeams", () => {
  it("orders by score, highest first, and keeps each team's index", () => {
    const result = rankTeams([team("A", 100), team("B", 300), team("C", 200)]);
    expect(result.map((s) => [s.team.id, s.rank, s.index])).toEqual([
      ["B", 1, 1],
      ["C", 2, 2],
      ["A", 3, 0],
    ]);
  });

  it("gives tied teams the same rank and skips the next", () => {
    const result = rankTeams([team("A", 200), team("B", 500), team("C", 500), team("D", 100)]);
    expect(result.map((s) => [s.team.id, s.rank])).toEqual([
      ["B", 1],
      ["C", 1],
      ["A", 3],
      ["D", 4],
    ]);
  });

  it("handles negative scores", () => {
    expect(rankTeams([team("A", -100), team("B", 0)]).map((s) => s.team.id)).toEqual([
      "B",
      "A",
    ]);
  });
});

describe("getWinners", () => {
  it("returns one winner, or everyone tied for first", () => {
    expect(getWinners([team("A", 1), team("B", 2)]).map((s) => s.team.id)).toEqual(["B"]);
    expect(getWinners([team("A", 0), team("B", 0)]).map((s) => s.team.id)).toEqual(["A", "B"]);
  });
});
