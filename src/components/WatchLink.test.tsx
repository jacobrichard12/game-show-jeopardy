import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import TitlePage from "./TitlePage";
import WatchLink from "./WatchLink";
import { createDefaultTeams, GameState } from "../shared/types";

describe("WatchLink", () => {
  const original = navigator.clipboard;
  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", { value: original, configurable: true });
  });

  it("shows the full TV link for this game", () => {
    render(<WatchLink code="ABCD" />);
    expect((screen.getByLabelText("TV link") as HTMLInputElement).value).toBe(
      `${window.location.origin}/watch/ABCD`
    );
  });

  it("copies it to the clipboard", async () => {
    const writes: string[] = [];
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: (text: string) => (writes.push(text), Promise.resolve()) },
      configurable: true,
    });
    render(<WatchLink code="ABCD" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(writes).toEqual([`${window.location.origin}/watch/ABCD`]);
    expect(screen.getByRole("button", { name: "Copied!" })).toBeInTheDocument();
  });

  it("selects the link when the clipboard isn't available", () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    render(<WatchLink code="ABCD" />);
    fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("button", { name: "Press ⌘C" })).toBeInTheDocument();
    const input = screen.getByLabelText("TV link") as HTMLInputElement;
    expect([input.selectionStart, input.selectionEnd]).toEqual([0, input.value.length]);
  });
});

describe("lobby screen", () => {
  const gameState = { started: false, teams: createDefaultTeams(2) } as unknown as GameState;
  it("shows the TV link to the host only", () => {
    const { rerender } = render(
      <TitlePage isAdmin code="ABCD" gameState={gameState} sendGameStateToServer={() => {}} />
    );
    expect(screen.getByLabelText("TV link")).toBeInTheDocument();
    rerender(<TitlePage isAdmin={false} code="ABCD" gameState={gameState} sendGameStateToServer={() => {}} />);
    expect(screen.queryByLabelText("TV link")).toBeNull();
  });
});

describe("lobby title screen", () => {
  const base = { started: false, teams: createDefaultTeams(2) } as unknown as GameState;
  it("shows the usual title, or a content pack's own", () => {
    const { rerender } = render(<TitlePage isAdmin={false} gameState={base} sendGameStateToServer={() => {}} />);
    expect(screen.getByRole("heading", { name: "Game Show Jeopardy" })).toBeInTheDocument();
    expect(screen.getByText("Welcome to the Ultimate Game Experience!")).toBeInTheDocument();

    rerender(
      <TitlePage
        isAdmin={false}
        gameState={{ ...base, titleScreen: { title: "Exult Game Show", subtitle: "Welcome to the Exult Conference!" } }}
        sendGameStateToServer={() => {}}
      />
    );
    expect(screen.getByRole("heading", { name: "Exult Game Show" })).toBeInTheDocument();
    expect(screen.getByText("Welcome to the Exult Conference!")).toBeInTheDocument();
  });
});
