import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { createDefaultTeams, GameName, GameState, SIDE_CHARADES_KEY } from "../shared/types";
import SideCharades from "./SideCharades";

const base = (overrides: Partial<GameState> = {}): GameState =>
  ({
    started: true,
    teams: createDefaultTeams(2),
    currentGame: { gameName: GameName.BOARD, gameTitle: "", value: 0, questionState: { promptVisible: false } },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: { charades: { [SIDE_CHARADES_KEY]: { category: "Reverse Charades", words: ["Halo", "Choir", "Pew"] } } },
    ...overrides,
  } as unknown as GameState);

describe("SideCharades", () => {
  it("runs turns back and forth with running totals", () => {
    const sent: GameState[] = [];
    const { rerender } = render(<SideCharades isAdmin gameState={base()} sendGameStateToServer={(gs) => sent.push(gs)} />);
    // The host sees the next word before any turn.
    expect(screen.getByLabelText("Current word")).toHaveTextContent("Halo");

    fireEvent.click(screen.getByRole("button", { name: "Start Team A's turn" }));
    let state = sent[sent.length - 1];
    expect(state.sideCharades).toMatchObject({ activeTeamId: "team-1", turns: 1, turnScore: 0 });
    // No clock of its own: the host times turns with Toggle Timer.
    expect(screen.queryByRole("button", { name: /clock/i })).toBeNull();

    rerender(<SideCharades isAdmin gameState={state} sendGameStateToServer={(gs) => sent.push(gs)} />);
    fireEvent.click(screen.getByRole("button", { name: "✓ Got it" }));
    state = sent[sent.length - 1];
    expect(state.sideCharades).toMatchObject({ wordIndex: 1, turnScore: 1, totals: { "team-1": 1 } });

    rerender(<SideCharades isAdmin gameState={state} sendGameStateToServer={(gs) => sent.push(gs)} />);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    state = sent[sent.length - 1];
    expect(state.sideCharades).toMatchObject({ wordIndex: 2, turnScore: 1, totals: { "team-1": 1 } });

    // End turn hides the word on the TV until the next team starts.
    rerender(<SideCharades isAdmin gameState={state} sendGameStateToServer={(gs) => sent.push(gs)} />);
    fireEvent.click(screen.getByRole("button", { name: "End turn" }));
    state = sent[sent.length - 1];
    expect(state.sideCharades).toMatchObject({ activeTeamId: null, lastTeamId: "team-1" });
    const tv = render(<SideCharades isAdmin={false} gameState={state} sendGameStateToServer={() => {}} />);
    expect(tv.getByText("Get ready…")).toBeInTheDocument();
    tv.unmount();

    // Team B's turn: totals carry over, words continue from the same place.
    rerender(<SideCharades isAdmin gameState={state} sendGameStateToServer={(gs) => sent.push(gs)} />);
    fireEvent.click(screen.getByRole("button", { name: "Start Team B's turn" }));
    state = sent[sent.length - 1];
    expect(state.sideCharades).toMatchObject({ activeTeamId: "team-2", turns: 2, wordIndex: 2, totals: { "team-1": 1 } });
    rerender(<SideCharades isAdmin gameState={state} sendGameStateToServer={(gs) => sent.push(gs)} />);
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Current word")).toHaveTextContent("Pew");
  });

  it("shows the TV a get-ready screen, not the word, between turns", () => {
    render(<SideCharades isAdmin={false} gameState={base()} sendGameStateToServer={() => {}} />);
    expect(screen.getByText("Get ready…")).toBeInTheDocument();
    expect(screen.queryByLabelText("Current word")).toBeNull();
  });
});
