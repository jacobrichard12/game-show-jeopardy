import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import partyGames from "../data/partyGames.json";
import { ALPHABET } from "../shared/partyGames";
import { buildSlotBank, DifficultyBank } from "../shared/slots";
import { GameName, getGameTitle } from "../shared/types";
import Sandbox from "./Sandbox";

// The Minute game embeds a YouTube player; don't load the real iframe API.
jest.mock("react-youtube", () => ({ __esModule: true, default: () => null }));

// user-event v13 ships its own copy of @testing-library/dom, separate from the
// one React Testing Library configures, so its events aren't wrapped in act()
// automatically. Wrap them here so React flushes before each assertion.
const click = (el: HTMLElement) => {
  act(() => {
    userEvent.click(el);
  });
};
const type = (el: HTMLElement, text: string) => {
  act(() => {
    userEvent.type(el, text);
  });
};
const select = (el: HTMLElement, value: string) => {
  act(() => {
    userEvent.selectOptions(el, value);
  });
};

const tv = () => screen.getByLabelText("TV display");
const host = () => screen.getByText("Host panel").closest("section") as HTMLElement;
const chooseGame = (title: string) => select(screen.getByLabelText("Game mode"), title);
const revealToTv = () => click(screen.getByRole("button", { name: /Next \(reveal to TV\)/ }));

beforeEach(() => {
  // jsdom doesn't implement media playback; the games play sounds on the TV.
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve()) as any;
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

describe("Sandbox", () => {
  it("starts on Wheel Puzzle with a host panel and a TV, hidden until 'Next'", () => {
    render(<Sandbox />);
    expect(screen.getByText("Host panel")).toBeInTheDocument();
    expect(screen.getByText("TV display")).toBeInTheDocument();
    expect(within(tv()).getByText(/The question will be revealed soon/)).toBeInTheDocument();

    revealToTv();
    expect(within(tv()).queryByText(/revealed soon/)).not.toBeInTheDocument();
  });

  it("can show just the host or just the TV", () => {
    render(<Sandbox />);
    click(screen.getByRole("button", { name: "TV only" }));
    expect(screen.queryByText("Host panel")).not.toBeInTheDocument();
    expect(screen.getByLabelText("TV display")).toBeInTheDocument();
    click(screen.getByRole("button", { name: "Host only" }));
    expect(screen.getByText("Host panel")).toBeInTheDocument();
    expect(screen.queryByLabelText("TV display")).not.toBeInTheDocument();
  });

  it("shows the question slot in the state panel", () => {
    render(<Sandbox />);
    click(screen.getByRole("button", { name: /Show game state/ }));
    expect(screen.getByText(/"slot": 100/)).toBeInTheDocument();
    click(screen.getByLabelText("Double Jeopardy"));
    // A 100 tile in Double Jeopardy is worth 200 and uses the twin slot (200/2+1).
    expect(screen.getByText(/"slot": 101/)).toBeInTheDocument();
  });

  describe("Wheel Puzzle", () => {
    it("host taps letters; both screens mark them used and the TV can't tap", () => {
      render(<Sandbox />);
      revealToTv();

      const [hostA, tvA] = screen.getAllByRole("button", { name: "Guess A" });
      expect(hostA).toBeEnabled();
      expect(tvA).toBeDisabled();

      click(hostA);
      screen.getAllByRole("button", { name: "Guess A" }).forEach((b) => expect(b).toBeDisabled());
    });

    it("passes the turn on a miss but keeps it on a hit", () => {
      // Pin the shuffle so the puzzle in the 100 slot is known ahead of time.
      const random = jest.spyOn(Math, "random").mockReturnValue(0.5);
      try {
        const { phrase } = buildSlotBank(
          partyGames.wheel as unknown as DifficultyBank<{ phrase: string }>
        )[100];
        const hitLetter = ALPHABET.find((l) => phrase.includes(l))!;
        const missLetter = ALPHABET.find((l) => !phrase.includes(l))!;

        render(<Sandbox />);
        revealToTv();
        click(screen.getByRole("button", { name: /Show game state/ }));
        expect(screen.getByText(/"whoseTurn": "team-1"/)).toBeInTheDocument();

        // A hit keeps the turn with the same team...
        click(screen.getAllByRole("button", { name: `Guess ${hitLetter}` })[0]);
        expect(screen.getByText(/"whoseTurn": "team-1"/)).toBeInTheDocument();

        // ...a miss passes it on.
        click(screen.getAllByRole("button", { name: `Guess ${missLetter}` })[0]);
        expect(screen.getByText(/"whoseTurn": "team-2"/)).toBeInTheDocument();
      } finally {
        random.mockRestore();
      }
    });

    it("'Reveal puzzle' finishes it", () => {
      render(<Sandbox />);
      revealToTv();
      click(screen.getByRole("button", { name: "Reveal puzzle" }));
      expect(within(tv()).getByText("Solved!")).toBeInTheDocument();
    });
  });

  describe("Act / Draw / Describe", () => {
    it("shows the secret word only to the host until revealed", () => {
      render(<Sandbox />);
      chooseGame("Act, Draw, Describe");
      revealToTv();

      expect(screen.getByText(/Secret word \(host only\)/)).toBeInTheDocument();
      expect(within(tv()).queryByText(/The word was/)).not.toBeInTheDocument();
      expect(within(tv()).getByLabelText("Time remaining")).toHaveTextContent(/^[01]:\d\d$/);

      click(screen.getByRole("button", { name: "Show word on TV" }));
      expect(within(tv()).getByText(/The word was/)).toBeInTheDocument();
    });

    it("the host can start the clock", () => {
      render(<Sandbox />);
      chooseGame("Act, Draw, Describe");
      revealToTv();
      click(screen.getByRole("button", { name: /Start clock/ }));
      expect(screen.getByRole("button", { name: /Pause clock/ })).toBeInTheDocument();
    });
  });

  describe("Scavenger Sprint", () => {
    it("shows the item and a clock on the TV", () => {
      render(<Sandbox />);
      chooseGame("Scavenger Sprint");
      revealToTv();
      expect(within(tv()).getByText(/Find it and bring it to the host/)).toBeInTheDocument();
      expect(within(tv()).getByLabelText("Time remaining")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Start clock/ })).toBeInTheDocument();
    });
  });

  describe("Closest Wins", () => {
    it("locks guesses, reveals, names the closest team, and awards the tile", () => {
      render(<Sandbox />);
      chooseGame("Closest Wins");
      revealToTv();

      // Everything shows "thinking" until locked in, and nothing is revealed yet.
      expect(within(tv()).getAllByText("thinking…")).toHaveLength(2);
      expect(screen.getByRole("button", { name: "Reveal answer" })).toBeDisabled();

      // 0 and 1 are both at-or-under every answer in the bank, so 1 is always closer.
      type(screen.getByLabelText("Team A guess"), "0");
      click(screen.getByRole("button", { name: "Lock in Team A" }));
      type(screen.getByLabelText("Team B guess"), "1");
      click(screen.getByRole("button", { name: "Lock in Team B" }));
      expect(within(tv()).getAllByText(/Locked in/)).toHaveLength(2);

      click(screen.getByRole("button", { name: "Reveal answer" }));
      expect(within(tv()).getByText("Winner: Team B")).toBeInTheDocument();

      // Award the tile to the winner with the normal points button.
      click(screen.getByRole("button", { name: /Add 100 points to Team B/ }));
      expect(within(tv()).getByText("100")).toBeInTheDocument();
    });

    it("lets the host change a locked guess", () => {
      render(<Sandbox />);
      chooseGame("Closest Wins");
      revealToTv();
      type(screen.getByLabelText("Team A guess"), "5");
      click(screen.getByRole("button", { name: "Lock in Team A" }));
      click(screen.getByRole("button", { name: "Change Team A" }));
      expect(screen.getByLabelText("Team A guess")).toHaveValue("5");
    });
  });

  describe("Put It In Order", () => {
    it("reveals the order step by step, then shows results", () => {
      render(<Sandbox />);
      chooseGame("Put It In Order");
      revealToTv();

      expect(within(tv()).getByText("Scrambled")).toBeInTheDocument();
      // Nothing revealed yet on the TV: only "?" placeholders in the answer column.
      expect(within(tv()).getAllByText("?").length).toBeGreaterThanOrEqual(3);

      click(screen.getByRole("button", { name: "Reveal next" }));
      expect(within(tv()).getAllByText("?").length).toBeGreaterThanOrEqual(2);

      click(screen.getByRole("button", { name: "Reveal all" }));
      expect(within(tv()).queryByText("?")).not.toBeInTheDocument();

      select(screen.getByLabelText("Team A correct"), "3");
      select(screen.getByLabelText("Team B correct"), "1");
      click(screen.getByRole("button", { name: "Show results on TV" }));
      expect(within(tv()).getByText(/^3 \/ \d+ correct$/)).toBeInTheDocument();
      expect(within(tv()).getByText(/^1 \/ \d+ correct$/)).toBeInTheDocument();
    });
  });

  describe("Family Feud (original game)", () => {
    it("host reveals an answer and the TV shows it", () => {
      render(<Sandbox />);
      chooseGame("Family Feud");
      revealToTv();

      const tvItems = () => within(tv()).getAllByRole("listitem");
      expect(tvItems()[0]).toHaveTextContent(/^1$/); // numbered chip, answer hidden

      click(within(host()).getAllByRole("listitem")[0]);
      expect(tvItems()[0]).not.toHaveTextContent(/^1$/); // now shows the answer + points
    });

    it("Show Feud Prompt is recorded", () => {
      render(<Sandbox />);
      chooseGame("Family Feud");
      revealToTv();
      click(screen.getByRole("button", { name: /Show game state/ }));
      expect(screen.getByText(/"showFeudPrompt": false/)).toBeInTheDocument();
      click(screen.getByRole("button", { name: "Show Feud Prompt" }));
      expect(screen.getByText(/"showFeudPrompt": true/)).toBeInTheDocument();
    });
  });

  describe("Millionaire (original game)", () => {
    // Answer buttons are labelled "A.", "B.", ... in a leading <span>.
    const answerButton = (letter: string) =>
      Array.from(host().querySelectorAll("button")).find(
        (b) => b.firstElementChild?.textContent === `${letter}.`
      ) as HTMLElement;

    it("reveals answers one at a time, then takes the contestant's pick", () => {
      render(<Sandbox />);
      chooseGame("Who Wants To Be A Millionaire");
      revealToTv();

      expect(within(tv()).getAllByText("???")).toHaveLength(4);
      for (let i = 0; i < 4; i++) {
        click(screen.getByRole("button", { name: "Reveal Next Answer" }));
      }
      expect(within(tv()).queryByText("???")).not.toBeInTheDocument();

      expect(screen.getByRole("button", { name: "Highlight Correct Answer" })).toBeDisabled();
      click(answerButton("A"));
      expect(screen.getByRole("button", { name: "Highlight Correct Answer" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Next Question" })).toBeEnabled();
    });
  });

  describe("Minute To Win It (original game)", () => {
    it("the host can play the video on the TV", () => {
      render(<Sandbox />);
      chooseGame("Minute To Win It");
      revealToTv();
      expect(screen.getByText("Video on the display is paused.")).toBeInTheDocument();
      click(screen.getByRole("button", { name: /Play video/ }));
      expect(screen.getByText("Video on the display is playing.")).toBeInTheDocument();
    });
  });

  describe("Head To Head (original game)", () => {
    it("shows players per team, then the title once the host reveals it", () => {
      render(<Sandbox />);
      chooseGame("Head To Head");
      revealToTv();
      expect(within(tv()).getByText(/Players Per Team/)).toBeInTheDocument();

      const before = within(tv()).getAllByRole("heading", { level: 1 }).length;
      click(screen.getByRole("button", { name: "Show Title" }));
      expect(within(tv()).getAllByRole("heading", { level: 1 }).length).toBe(before + 1);
    });
  });

  // Every game must have a question for every tile, in both rounds. This is
  // the guard against a bank that's too short for the board.
  it("every game has a question for every tile, with and without Double Jeopardy", () => {
    render(<Sandbox />);
    const games = Object.values(GameName).filter(
      (g) => !["board", "timer"].includes(g)
    );
    expect(games).toHaveLength(9);

    games.forEach((game) => {
      chooseGame(getGameTitle(game));
      [100, 200, 300, 400, 500].forEach((tile) => {
        select(screen.getByLabelText("Tile value"), String(tile));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        click(screen.getByLabelText("Double Jeopardy"));
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        click(screen.getByLabelText("Double Jeopardy")); // back to normal
      });
    });
  });

  it("scores carry across games and can be reset", () => {
    render(<Sandbox />);
    revealToTv();
    click(screen.getByRole("button", { name: "Reveal puzzle" }));
    click(screen.getByRole("button", { name: /Add 100 points to Team A/ }));
    expect(within(tv()).getByText("100")).toBeInTheDocument();

    chooseGame("Scavenger Sprint");
    expect(within(tv()).getByText("100")).toBeInTheDocument();

    click(screen.getByRole("button", { name: "Reset scores" }));
    expect(within(tv()).queryByText("100")).not.toBeInTheDocument();
  });

  it("supports four teams", () => {
    render(<Sandbox />);
    select(screen.getByLabelText("Team count"), "4");
    expect(within(tv()).getByText("Team D")).toBeInTheDocument();
  });
});
