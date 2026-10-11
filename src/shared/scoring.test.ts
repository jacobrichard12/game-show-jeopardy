import { awardPoints } from "./scoring";
import { createDefaultTeams, GameName, GameState } from "./types";

const makeState = (overrides: Partial<GameState> = {}): GameState =>
  ({
    teams: createDefaultTeams(2),
    whoseTurn: "team-1",
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    ...overrides,
  } as unknown as GameState);

describe("awardPoints", () => {
  it("adds the points, marks the tile answered and gives the team the turn", () => {
    const next = awardPoints(makeState(), "team-2", 300, GameName.WHEEL, false);
    expect(next.teams.find((t) => t.id === "team-2")?.score).toBe(300);
    expect(next.teams.find((t) => t.id === "team-1")?.score).toBe(0);
    expect(next.answered).toEqual({ wheel: [300] });
    expect(next.whoseTurn).toBe("team-2");
  });

  it("accumulates score and answered tiles", () => {
    let state = makeState();
    state = awardPoints(state, "team-1", 100, GameName.WHEEL, false);
    state = awardPoints(state, "team-1", 200, GameName.WHEEL, false);
    expect(state.teams[0].score).toBe(300);
    expect(state.answered.wheel).toEqual([100, 200]);
  });

  it("no-points marks the tile but changes neither score nor turn", () => {
    const next = awardPoints(makeState({ whoseTurn: "team-1" }), "team-2", 200, GameName.ORDER, true);
    expect(next.teams.map((t) => t.score)).toEqual([0, 0]);
    expect(next.answered).toEqual({ order: [200] });
    expect(next.whoseTurn).toBe("team-1");
    // The TV's sad moment keys off this count.
    expect(next.noPointsCount).toBe(1);
    expect(awardPoints(next, "team-1", 300, GameName.ORDER, true).noPointsCount).toBe(2);
    expect(awardPoints(next, "team-1", 300, GameName.ORDER, false).noPointsCount).toBe(1);
  });

  it("uses the Double Jeopardy answered map in the second round", () => {
    const next = awardPoints(makeState({ isDoubleJeopardy: true }), "team-1", 400, GameName.CLOSEST, false);
    expect(next.doubleJeopardyAnswered).toEqual({ closest: [400] });
    expect(next.answered).toEqual({});
  });

  it("ignores an unknown team", () => {
    const state = makeState();
    expect(awardPoints(state, "nobody", 100, GameName.WHEEL, false)).toBe(state);
  });

  it("does not mutate the original state", () => {
    const state = makeState();
    awardPoints(state, "team-1", 100, GameName.WHEEL, false);
    expect(state.teams[0].score).toBe(0);
    expect(state.answered).toEqual({});
  });
});
