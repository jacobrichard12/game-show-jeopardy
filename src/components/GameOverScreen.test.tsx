import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import GameOverScreen from "./GameOverScreen";
import SettingsModal from "./SettingsModal";
import { GameState, TeamState } from "../shared/types";

const teams: TeamState[] = [
  { id: "team-1", name: "Smiths", score: 300 },
  { id: "team-2", name: "Joneses", score: 800 },
  { id: "team-3", name: "Lees", score: 100 },
];

describe("GameOverScreen", () => {
  it("names the winner and lists teams highest first", () => {
    render(<GameOverScreen teams={teams} isAdmin={false} />);
    expect(screen.getByRole("heading").textContent).toBe("Joneses wins!");
    const rows = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(rows).toEqual(["🏆Joneses800", "#2Smiths300", "#3Lees100"]);
  });

  it("calls a tie when teams share the top score", () => {
    const tied = [...teams, { id: "team-4", name: "Parks", score: 800 }];
    render(<GameOverScreen teams={tied} isAdmin={false} />);
    expect(screen.getByRole("heading").textContent).toBe("It's a tie!");
    expect(screen.getAllByText("🏆")).toHaveLength(2);
  });

  it("shows host buttons only to the host", () => {
    const { rerender } = render(<GameOverScreen teams={teams} isAdmin={false} />);
    expect(screen.queryByRole("button")).toBeNull();

    const onBack = jest.fn();
    rerender(<GameOverScreen teams={teams} isAdmin onBackToBoard={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "← Back to board" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("asks before playing again", () => {
    const onPlayAgain = jest.fn();
    render(<GameOverScreen teams={teams} isAdmin onPlayAgain={onPlayAgain} />);

    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onPlayAgain).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Play again" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, play again" }));
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});

describe("SettingsModal end game", () => {
  const gameState = {
    started: true,
    teams,
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
  } as unknown as GameState;

  const renderModal = (state: GameState, onEndGame = jest.fn(), onClose = jest.fn()) => {
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        onSave={jest.fn()}
        onReset={jest.fn()}
        onEndGame={onEndGame}
        gameState={state}
      />
    );
    return { onEndGame, onClose };
  };

  it("ends the game and closes", () => {
    const { onEndGame, onClose } = renderModal(gameState);
    fireEvent.click(screen.getByRole("button", { name: /End game/ }));
    expect(onEndGame).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("hides the button once the game is over", () => {
    renderModal({ ...gameState, gameOver: true });
    expect(screen.queryByRole("button", { name: /End game/ })).toBeNull();
  });
});

describe("SettingsModal board theme", () => {
  const base = {
    started: true,
    teams,
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
  } as unknown as GameState;

  const renderModal = (onSave: jest.Mock, onClose = jest.fn()) =>
    render(
      <SettingsModal
        isOpen
        onClose={onClose}
        onSave={onSave}
        onReset={jest.fn()}
        onEndGame={jest.fn()}
        gameState={base}
      />
    );

  it("shows the current theme (Original when unset) and saves a new one", () => {
    const onSave = jest.fn();
    renderModal(onSave);
    expect(screen.getByRole("button", { name: /Original/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Neon/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ theme: "neon" }));
  });

  it("Cancel discards the choice", () => {
    const onSave = jest.fn();
    renderModal(onSave);
    fireEvent.click(screen.getByRole("button", { name: /Holiday/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
