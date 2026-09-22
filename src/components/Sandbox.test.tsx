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

// Sources of every sound played, in order (asset imports are file names in
// tests, e.g. "http://localhost/yay.mp3").
let played: string[] = [];
const playedSince = (from: number) => played.slice(from);

beforeEach(() => {
  played = [];
  // jsdom doesn't implement media playback; the games play sounds on the TV.
  window.HTMLMediaElement.prototype.play = jest.fn(function (this: HTMLMediaElement) {
    played.push(this.src);
    return Promise.resolve();
  }) as any;
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

const HAPPY = /(yay|winning\d)\./;

describe("Sandbox", () => {
  it("starts on Guess That Word with a host panel and a TV, hidden until 'Next'", () => {
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

    it("plays the puzzle-display sting once when the puzzle appears on the TV", () => {
      render(<Sandbox />);
      expect(played).toEqual([]);
      revealToTv();
      expect(played).toEqual([expect.stringMatching(/puzzle-display/)]);
    });

    it("'Reveal puzzle' finishes it with a cheer on the TV", () => {
      render(<Sandbox />);
      revealToTv();
      const before = played.length;
      click(screen.getByRole("button", { name: "Reveal puzzle" }));
      expect(within(tv()).getByText("Solved!")).toBeInTheDocument();
      expect(playedSince(before)).toEqual([expect.stringMatching(HAPPY)]);
    });

    it("'Wrong guess' flashes an X with a buzzer on the TV and passes the turn", () => {
      render(<Sandbox />);
      revealToTv();
      click(screen.getByRole("button", { name: /Show game state/ }));
      expect(within(tv()).queryByRole("img", { name: "Wrong" })).not.toBeInTheDocument();

      const before = played.length;
      click(screen.getByRole("button", { name: /Wrong guess/ }));
      expect(within(tv()).getByRole("img", { name: "Wrong" })).toBeInTheDocument();
      // Only the TV flashes; the host panel doesn't get a full-screen X.
      expect(within(host()).queryByRole("img", { name: "Wrong" })).not.toBeInTheDocument();
      expect(playedSince(before)).toEqual([expect.stringMatching(/buzzer/)]);
      expect(screen.getByText(/"whoseTurn": "team-2"/)).toBeInTheDocument();
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
    it("hides the item until the host shows it, which starts the clock", () => {
      render(<Sandbox />);
      chooseGame("Scavenger Sprint");
      revealToTv();
      expect(within(tv()).getByText(/Find it and bring it to the host/)).toBeInTheDocument();
      expect(within(tv()).getByText("Get ready…")).toBeInTheDocument();
      expect(within(tv()).getByLabelText("Time remaining")).toBeInTheDocument();
      expect(screen.getByText("Item (host only)")).toBeInTheDocument();
      // No separate start: the clock starts with the reveal.
      expect(screen.queryByRole("button", { name: /Start clock/ })).not.toBeInTheDocument();

      click(screen.getByRole("button", { name: /Show item & start clock/ }));
      expect(within(tv()).queryByText("Get ready…")).not.toBeInTheDocument();
      expect(screen.getByText("On the TV now")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Show item & start clock/ })).toBeDisabled();
      expect(screen.getByRole("button", { name: /Pause clock/ })).toBeInTheDocument();
    });
  });

  describe("Countdown clock", () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it("the host can change the seconds; the TV shows Time's up with a buzzer at zero", () => {
      jest.useFakeTimers();
      render(<Sandbox />);
      chooseGame("Act, Draw, Describe");
      revealToTv();

      const seconds = screen.getByLabelText("Clock seconds");
      act(() => {
        userEvent.clear(seconds);
      });
      type(seconds, "90");
      click(screen.getByRole("button", { name: "Set seconds" }));
      expect(within(tv()).getByLabelText("Time remaining")).toHaveTextContent("1:30");

      act(() => {
        userEvent.clear(seconds);
      });
      type(seconds, "5");
      click(screen.getByRole("button", { name: "Set seconds" }));
      expect(within(tv()).getByLabelText("Time remaining")).toHaveTextContent("0:05");

      click(screen.getByRole("button", { name: /Start clock/ }));
      // The seconds box is locked while the clock runs.
      expect(screen.getByLabelText("Clock seconds")).toBeDisabled();
      const before = played.length;
      // One second at a time, so each second renders (and sounds) on its own.
      for (let i = 0; i < 6; i++) {
        act(() => {
          jest.advanceTimersByTime(1000);
        });
      }
      expect(within(tv()).getByText("Time's up!")).toBeInTheDocument();
      const sounds = playedSince(before);
      // A tick (not the answer ding) for each of the last seconds, then the buzzer.
      expect(sounds.filter((src) => /tick/.test(src)).length).toBeGreaterThanOrEqual(4);
      expect(sounds.filter((src) => /yes-ding/.test(src))).toHaveLength(0);
      expect(sounds.filter((src) => /buzzer/.test(src))).toHaveLength(1);
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

      const before = played.length;
      click(screen.getByRole("button", { name: "Reveal answer" }));
      expect(within(tv()).getByText("Winner: Team B")).toBeInTheDocument();
      expect(playedSince(before)).toEqual([expect.stringMatching(HAPPY)]);

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
    it("one team plays; the order is revealed step by step with a ding each time", () => {
      render(<Sandbox />);
      chooseGame("Put It In Order");
      revealToTv();

      expect(within(tv()).getByText("Scrambled")).toBeInTheDocument();
      expect(within(tv()).getByText(/Playing:/)).toHaveTextContent("Playing: Team A");
      // Nothing revealed yet on the TV: only "?" placeholders in the answer column.
      expect(within(tv()).getAllByText("?").length).toBeGreaterThanOrEqual(3);

      let before = played.length;
      click(screen.getByRole("button", { name: "Reveal next" }));
      expect(within(tv()).getAllByText("?").length).toBeGreaterThanOrEqual(2);
      expect(playedSince(before)).toEqual([expect.stringMatching(/yes-ding/)]);

      before = played.length;
      click(screen.getByRole("button", { name: "Reveal next" }));
      expect(playedSince(before)).toEqual([expect.stringMatching(/yes-ding/)]);

      const hostText = host().textContent;
      click(screen.getByRole("button", { name: "Reveal all" }));
      expect(within(tv()).queryByText("?")).not.toBeInTheDocument();
      expect(host().textContent).toBe(hostText);
      // No per-team comparison any more.
      expect(screen.queryByText(/positions did each team get right/)).not.toBeInTheDocument();
    });
  });

  describe("Reverse Charades", () => {
    it("each team takes a timed turn; Got it scores, Skip moves on", () => {
      render(<Sandbox />);
      chooseGame("Reverse Charades");
      revealToTv();

      // Before any turn the TV shows no word.
      expect(within(tv()).getByText("Get ready…")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Got it/ })).toBeDisabled();

      click(screen.getByRole("button", { name: "Start Team A's turn" }));
      expect(within(tv()).getByText(/Up now:/)).toHaveTextContent("Team A");
      expect(screen.getByRole("button", { name: /Pause clock/ })).toBeInTheDocument();
      const firstWord = within(tv()).getByLabelText("Current word").textContent!;
      expect(firstWord.length).toBeGreaterThan(0);

      const before = played.length;
      click(screen.getByRole("button", { name: /Got it/ }));
      expect(playedSince(before)).toEqual([expect.stringMatching(/yes-ding/)]);
      click(screen.getByRole("button", { name: "Skip" }));
      click(screen.getByRole("button", { name: /Got it/ }));
      expect(within(tv()).getByText("2 words")).toBeInTheDocument();
      expect(within(tv()).getByLabelText("Current word")).not.toHaveTextContent(firstWord);

      click(screen.getByRole("button", { name: "Start Team B's turn" }));
      expect(within(tv()).getByText(/Up now:/)).toHaveTextContent("Team B");
      expect(within(tv()).getByText("0 words")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Redo Team A's turn" })).toBeInTheDocument();
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

    it("the host sees the prompt from the start, so showing it doesn't move the host's buttons", () => {
      render(<Sandbox />);
      chooseGame("Family Feud");
      revealToTv();
      const hostText = host().textContent;
      expect(within(tv()).queryByText(/\?$/)).not.toBeInTheDocument();
      click(screen.getByRole("button", { name: "Show Feud Prompt" }));
      expect(host().textContent).toBe(hostText);
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
      // The host already sees the answers, so revealing doesn't change the
      // host panel's text (which is what made the buttons jump).
      expect(within(host()).queryByText("???")).not.toBeInTheDocument();
      const hostText = host().textContent;
      for (let i = 0; i < 4; i++) {
        click(screen.getByRole("button", { name: "Reveal Next Answer" }));
      }
      expect(within(tv()).queryByText("???")).not.toBeInTheDocument();
      expect(host().textContent).toBe(hostText);

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
    expect(games).toHaveLength(10);

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
