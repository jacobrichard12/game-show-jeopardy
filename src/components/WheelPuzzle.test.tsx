import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { createDefaultTeams, GameName, GameState, WheelQuestionState } from "../shared/types";
import WheelPuzzle from "./WheelPuzzle";

// Guess That Word's "no two vowels in a row" rule on the host panel and TV.

beforeEach(() => {
  // The TV side plays sounds; jsdom doesn't implement media playback.
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve()) as any;
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

const click = (el: HTMLElement) => {
  act(() => {
    userEvent.click(el);
  });
};

const PHRASE = "FINDING NEMO"; // vowels I, E, O are in it; A and U aren't.
const VOWELS = ["A", "E", "I", "O", "U"];

function wheelState(guessedLetters: string[], solved = false): GameState {
  // Slot 100 holds the puzzle for a 100 tile (not Double Jeopardy).
  const wheel = { 100: { category: "Movie", phrase: PHRASE } };
  const questionState: WheelQuestionState = {
    promptVisible: true,
    guessedLetters,
    solved,
    wrongGuesses: 0,
  };
  return {
    started: true,
    teams: createDefaultTeams(2),
    whoseTurn: "team-1",
    currentGame: { gameName: GameName.WHEEL, gameTitle: "Guess That Word", value: 100, questionState },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: {
      feud: {},
      minute: {},
      millionaire: {},
      head: {},
      wheel,
      act: {},
      charades: {},
      scavenger: {},
      closest: {},
      order: {},
    },
  } as GameState;
}

const letterButton = (letter: string) => screen.getByRole("button", { name: `Guess ${letter}` });
const HINT = "Vowels locked until a consonant is called";

// A tiny host harness: keeps state locally so clicks feed back into the panel.
const Host: React.FC<{ initial: GameState }> = ({ initial }) => {
  const [state, setState] = React.useState(initial);
  return <WheelPuzzle isAdmin gameState={state} sendGameStateToServer={setState} />;
};

describe("WheelPuzzle vowel lock (host)", () => {
  it("sanity: the fixture puzzle is on the board", () => {
    render(<Host initial={wheelState([])} />);
    expect(screen.getByText("Movie")).toBeInTheDocument();
    VOWELS.forEach((v) => expect(letterButton(v)).toBeEnabled());
    expect(screen.getByText(HINT)).toHaveClass("invisible");
  });

  it("locks the other vowels after a correct vowel, and a consonant unlocks them", () => {
    render(<Host initial={wheelState([])} />);
    click(letterButton("E"));

    ["A", "I", "O", "U"].forEach((v) => expect(letterButton(v)).toBeDisabled());
    ["B", "N", "Y", "Z"].forEach((c) => expect(letterButton(c)).toBeEnabled());
    expect(screen.getByText(HINT)).not.toHaveClass("invisible");

    click(letterButton("N"));
    ["A", "I", "O", "U"].forEach((v) => expect(letterButton(v)).toBeEnabled());
    expect(screen.getByText(HINT)).toHaveClass("invisible");
  });

  it("a wrong consonant also unlocks the vowels", () => {
    render(<Host initial={wheelState(["I"])} />);
    expect(letterButton("O")).toBeDisabled();
    click(letterButton("Z"));
    expect(letterButton("O")).toBeEnabled();
  });

  it("doesn't lock vowels after a wrong vowel", () => {
    render(<Host initial={wheelState([])} />);
    click(letterButton("A"));
    ["E", "I", "O", "U"].forEach((v) => expect(letterButton(v)).toBeEnabled());
    expect(screen.getByText(HINT)).toHaveClass("invisible");
  });

  it("ignores a click on a locked vowel", () => {
    const send = jest.fn();
    render(<WheelPuzzle isAdmin gameState={wheelState(["E"])} sendGameStateToServer={send} />);
    click(letterButton("I"));
    expect(send).not.toHaveBeenCalled();
  });

  it("shows no lock once solved", () => {
    render(<Host initial={wheelState(["E"], true)} />);
    expect(screen.getByText(HINT)).toHaveClass("invisible");
  });
});

describe("WheelPuzzle vowel lock (TV)", () => {
  it("greys out the locked vowels on the TV with a consonant cue", () => {
    render(<WheelPuzzle isAdmin={false} gameState={wheelState(["N", "O"])} sendGameStateToServer={jest.fn()} />);
    ["A", "E", "I", "U"].forEach((v) => expect(letterButton(v)).toHaveClass("bg-tile/40"));
    expect(letterButton("B")).not.toHaveClass("bg-tile/40");
    // The guessed vowel itself shows as a hit, not greyed.
    expect(letterButton("O")).toHaveClass("bg-emerald-600");
    expect(screen.getByText("Next letter must be a consonant")).not.toHaveClass("invisible");
  });

  it("shows nothing locked on the TV after a consonant", () => {
    render(<WheelPuzzle isAdmin={false} gameState={wheelState(["O", "N"])} sendGameStateToServer={jest.fn()} />);
    VOWELS.filter((v) => v !== "O").forEach((v) => expect(letterButton(v)).not.toHaveClass("bg-tile/40"));
    expect(screen.getByText("Next letter must be a consonant")).toHaveClass("invisible");
  });
});
