import {
  createDefaultTeams,
  getCurrentQuestion,
  getGameTitle,
  GameName,
  GameState,
  TEAM_NAME_MAX_LENGTH,
} from "./types";

describe("getGameTitle", () => {
  it("maps known games to display names", () => {
    expect(getGameTitle(GameName.BOARD)).toBe("Board");
    expect(getGameTitle(GameName.FAMILY_FEUD)).toBe("Family Feud");
    expect(getGameTitle(GameName.MILLIONAIRE)).toBe(
      "Who Wants To Be A Millionaire"
    );
    expect(getGameTitle(GameName.MINUTE)).toBe("Minute To Win It");
    expect(getGameTitle(GameName.HEAD_TO_HEAD)).toBe("Head To Head");
  });

  it("falls back for games without a title", () => {
    expect(getGameTitle(GameName.TIMER)).toBe("No Entry for Game Yet");
  });
});

describe("getCurrentQuestion", () => {
  const bank: Record<string, string> = { "100": "normal", "51": "double" };

  const makeState = (value: number, isDoubleJeopardy: boolean): GameState =>
    ({
      currentGame: { value },
      isDoubleJeopardy,
    } as unknown as GameState);

  it("looks up the tile value directly in a normal round", () => {
    expect(getCurrentQuestion(bank, makeState(100, false))).toBe("normal");
  });

  it("applies the Double Jeopardy offset (value / 2 + 1)", () => {
    // A 100-point DJ tile resolves to bank key 51.
    expect(getCurrentQuestion(bank, makeState(100, true))).toBe("double");
  });

  it("returns undefined for a tile with no matching entry", () => {
    expect(getCurrentQuestion(bank, makeState(999, false))).toBeUndefined();
  });
});

describe("createDefaultTeams", () => {
  it("uses Team A/B/… when no names are given", () => {
    expect(createDefaultTeams(3).map((t) => t.name)).toEqual([
      "Team A",
      "Team B",
      "Team C",
    ]);
  });

  it("uses given names, trimmed, with defaults for blanks", () => {
    const teams = createDefaultTeams(3, ["  Smiths ", "", "Joneses"]);
    expect(teams.map((t) => t.name)).toEqual(["Smiths", "Team B", "Joneses"]);
    expect(teams.map((t) => t.score)).toEqual([0, 0, 0]);
    expect(teams.map((t) => t.id)).toEqual(["team-1", "team-2", "team-3"]);
  });

  it("ignores bad input and extra names, and caps the length", () => {
    expect(createDefaultTeams(2, "nope").map((t) => t.name)).toEqual([
      "Team A",
      "Team B",
    ]);
    expect(createDefaultTeams(2, [42, null, "C"]).map((t) => t.name)).toEqual([
      "Team A",
      "Team B",
    ]);
    const long = "x".repeat(TEAM_NAME_MAX_LENGTH + 10);
    expect(createDefaultTeams(2, [long])[0].name).toHaveLength(
      TEAM_NAME_MAX_LENGTH
    );
  });
});
