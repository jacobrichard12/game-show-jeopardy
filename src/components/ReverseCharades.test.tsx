import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createDefaultTeams, GameName, GameState, mixedTileKey, SIDE_CHARADES_KEY } from "../shared/types";
import ReverseCharades from "./ReverseCharades";
import SideCharades from "./SideCharades";

// A Head to Head $400 tile playing Reverse Charades from the pack's tab list.
const sharedTile = (overrides: Partial<GameState> = {}): GameState =>
  ({
    started: true,
    teams: createDefaultTeams(2),
    currentGame: {
      gameName: GameName.CHARADES,
      gameTitle: "Head to Head",
      value: 400,
      column: "head",
      questionState: { promptVisible: true, activeTeamId: "team-1", wordIndex: 0, scores: { "team-1": 0, "team-2": null } },
    },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: {
      charades: {
        [mixedTileKey("head", 400)]: { words: [], shared: true },
        [SIDE_CHARADES_KEY]: { category: "Reverse Charades", words: ["Halo", "Choir", "Pew", "Organ"] },
      },
    },
    sideCharades: { activeTeamId: null, lastTeamId: null, wordIndex: 1, totals: {}, turnScore: 0, turns: 0 },
    ...overrides,
  } as unknown as GameState);

describe("Reverse Charades sharing the tab's list", () => {
  it("picks up where the tab left off and moves the same place on", () => {
    const sent: GameState[] = [];
    render(<ReverseCharades isAdmin gameState={sharedTile()} sendGameStateToServer={(gs) => sent.push(gs)} />);
    // The tab already used "Halo", so the tile starts on "Choir".
    expect(screen.getByLabelText("Current word")).toHaveTextContent("Choir");

    fireEvent.click(screen.getByRole("button", { name: "✓ Got it" }));
    const after = sent[sent.length - 1];
    expect(after.sideCharades!.wordIndex).toBe(2);
    expect((after.currentGame.questionState as any).scores["team-1"]).toBe(1);

    // Back on the tab, the next word is the one after the tile's.
    render(<SideCharades isAdmin gameState={after} sendGameStateToServer={() => {}} />);
    expect(screen.getAllByLabelText("Current word")[1]).toHaveTextContent("Pew");
  });

  it("moves on a word when a turn ends or another team starts mid-turn", () => {
    const sent: GameState[] = [];
    const { unmount } = render(
      <ReverseCharades isAdmin gameState={sharedTile()} sendGameStateToServer={(gs) => sent.push(gs)} />
    );
    fireEvent.click(screen.getByRole("button", { name: "End turn" }));
    let after = sent[sent.length - 1];
    expect(after.sideCharades!.wordIndex).toBe(2);
    expect((after.currentGame.questionState as any).activeTeamId).toBeNull();
    unmount();

    render(<ReverseCharades isAdmin gameState={sharedTile()} sendGameStateToServer={(gs) => sent.push(gs)} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Team B's turn" }));
    after = sent[sent.length - 1];
    expect(after.sideCharades!.wordIndex).toBe(2);
    expect((after.currentGame.questionState as any).activeTeamId).toBe("team-2");
    expect(after.whoseTurn).toBe("team-2");
  });

  it("moves on the tile's own word list too", () => {
    const sent: GameState[] = [];
    const ownTile = sharedTile({
      gameData: { charades: { 400: { words: ["Cat", "Dog"] } } },
      currentGame: { ...sharedTile().currentGame, column: undefined },
    } as unknown as Partial<GameState>);
    render(<ReverseCharades isAdmin gameState={ownTile} sendGameStateToServer={(gs) => sent.push(gs)} />);
    fireEvent.click(screen.getByRole("button", { name: "End turn" }));
    expect((sent[sent.length - 1].currentGame.questionState as any).wordIndex).toBe(1);
  });

  it("doesn't show a bank question's category", () => {
    const bankTile = sharedTile({
      gameData: { charades: { 400: { category: "Animals", words: ["Cat"] } } },
      currentGame: { ...sharedTile().currentGame, column: undefined },
    } as unknown as Partial<GameState>);
    render(<ReverseCharades isAdmin gameState={bankTile} sendGameStateToServer={() => {}} />);
    expect(screen.getByLabelText("Current word")).toHaveTextContent("Cat");
    expect(screen.queryByText("Animals")).toBeNull();
  });
});
