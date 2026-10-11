import { GameName, GameState, withGamePrefix } from "./types";

const playing = (gameName: GameName, column?: string) =>
  ({ currentGame: { gameName, gameTitle: "", value: 100, questionState: { promptVisible: true }, column } } as unknown as GameState);

describe("withGamePrefix", () => {
  it("prefixes a mixed tile's name with its game", () => {
    expect(withGamePrefix(playing(GameName.SCAVENGER, "head"), "A rosary")).toBe("Scavenger Sprint: A rosary");
    expect(withGamePrefix(playing(GameName.FAMILY_FEUD, "head"), "Name a pet")).toBe("Family Feud: Name a pet");
    expect(withGamePrefix(playing(GameName.MINUTE, "head"), "Spin Doctor")).toBe("Minute to win it: Spin Doctor");
  });

  it("leaves tiles in their own column alone", () => {
    expect(withGamePrefix(playing(GameName.SCAVENGER), "A rosary")).toBe("A rosary");
    expect(withGamePrefix(playing(GameName.SCAVENGER, "scavenger"), "A rosary")).toBe("A rosary");
  });
});
