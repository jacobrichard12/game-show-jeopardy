import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import partyGames from "../data/partyGames.json";
import { createInitialQuestionState } from "../shared/partyGames";
import { buildSlotBank, DifficultyBank } from "../shared/slots";
import { createDefaultTeams, GameName, GameState, getGameTitle } from "../shared/types";
import AdminPageWrapper from "./AdminPageWrapper";
import PageWrapper from "./PageWrapper";

// The party board in a real room: the host switches board pages and picks
// party tiles; the TV (PageWrapper) follows the page and shows the game.

jest.mock("react-youtube", () => ({ __esModule: true, default: () => null }));

beforeEach(() => {
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve()) as any;
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

const click = (el: HTMLElement) => {
  act(() => {
    userEvent.click(el);
  });
};

const bank = (source: unknown) => buildSlotBank(source as DifficultyBank<any>);

function roomState(overrides: Partial<GameState> = {}): GameState {
  return {
    started: true,
    teams: createDefaultTeams(2),
    whoseTurn: "team-1",
    currentGame: {
      gameName: GameName.BOARD,
      gameTitle: "GameBoard",
      value: 0,
      questionState: { promptVisible: false },
    },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: {
      feud: {},
      minute: {},
      millionaire: {},
      head: {},
      wheel: bank(partyGames.wheel),
      act: bank(partyGames.act),
      charades: bank(partyGames.charades),
      scavenger: bank(partyGames.scavenger),
      closest: bank(partyGames.closest),
      order: bank(partyGames.order),
    },
    ...overrides,
  };
}

function onTile(state: GameState, gameName: GameName, value: number): GameState {
  return {
    ...state,
    currentGame: {
      gameName,
      gameTitle: getGameTitle(gameName),
      value,
      questionState: { ...createInitialQuestionState(gameName, state.teams), promptVisible: true },
    },
  };
}

const hostProps = () => ({
  handleUpdateCurrentGame: jest.fn(),
  handleAddPoints: jest.fn(),
  handleRevealQuestion: jest.fn(),
  handleBackButon: jest.fn(),
  sendGameStateToServer: jest.fn(),
  handleUpdateTurn: jest.fn(),
});

const PARTY_TITLES = [
  "Guess That Word",
  "Act, Draw, Describe",
  "Reverse Charades",
  "Scavenger Sprint",
  "Closest Wins",
  "Put It In Order",
];

describe("party board on the TV", () => {
  it("shows the classic board by default and the party board when the host switches", () => {
    const { rerender } = render(<PageWrapper gameState={roomState()} />);
    expect(screen.getByText("Family Feud")).toBeInTheDocument();
    expect(screen.queryByText("Reverse Charades")).not.toBeInTheDocument();

    rerender(<PageWrapper gameState={roomState({ boardPage: "party" })} />);
    PARTY_TITLES.forEach((title) => expect(screen.getByText(title)).toBeInTheDocument());
    expect(screen.queryByText("Family Feud")).not.toBeInTheDocument();
  });

  it("marks used party tiles on the party board", () => {
    render(<PageWrapper gameState={roomState({ boardPage: "party", answered: { wheel: [100] } })} />);
    const wheelTiles = screen.getAllByRole("button", { name: "$100" });
    // One $100 tile per party column; only Guess That Word's is used.
    expect(wheelTiles).toHaveLength(6);
    expect(wheelTiles.filter((tile) => (tile as HTMLButtonElement).disabled)).toHaveLength(1);
  });

  it.each([
    [GameName.WHEEL, /Calling letters/],
    [GameName.ACT, /Up now|ACT IT OUT|DRAW IT|DESCRIBE IT/],
    [GameName.CHARADES, /REVERSE CHARADES/],
    [GameName.SCAVENGER, /Find it and bring it to the host/],
    [GameName.CLOSEST, /Closest|without going over/],
    [GameName.ORDER, /Put these in order/],
  ])("renders %s on the TV", (gameName, text) => {
    render(<PageWrapper gameState={onTile(roomState({ boardPage: "party" }), gameName, 200)} />);
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Content not available/)).not.toBeInTheDocument();
  });
});

describe("party board on the host panel", () => {
  it("switches the board page, which is sent to the TV", () => {
    const props = hostProps();
    render(<AdminPageWrapper gameState={roomState()} {...props} />);
    const pages = screen.getByRole("group", { name: "Board page" });
    expect(within(pages).getByRole("button", { name: "Classic Games" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    click(within(pages).getByRole("button", { name: "Party Games" }));
    expect(props.sendGameStateToServer).toHaveBeenCalledWith(
      expect.objectContaining({ boardPage: "party" })
    );
  });

  it("picking a party tile opens that game", () => {
    const props = hostProps();
    render(<AdminPageWrapper gameState={roomState({ boardPage: "party" })} {...props} />);
    // Tiles are in row order: the first $100 is the first column, Guess That Word.
    click(screen.getAllByRole("button", { name: "$100" })[0]);
    expect(props.handleUpdateCurrentGame).toHaveBeenCalledWith(GameName.WHEEL, 100);
  });

  it("shows the party game's host controls once revealed", () => {
    render(
      <AdminPageWrapper gameState={onTile(roomState(), GameName.SCAVENGER, 300)} {...hostProps()} />
    );
    expect(screen.getByText("Item (host only)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show item" })).toBeInTheDocument();
    expect(screen.queryByText("Host content")).not.toBeInTheDocument();
  });
});

describe("a custom pack's one-page board", () => {
  const custom = (overrides: Partial<GameState> = {}) =>
    roomState({
      board: [
        {
          id: "custom",
          label: "Smith night",
          columns: [
            { title: "Smith Family Feud", game: "feud" },
            { title: "Closest Wins", game: "closest" },
          ],
        },
      ],
      boardPage: "custom",
      ...overrides,
    });

  it("host: shows the pack's columns and no page tabs", () => {
    const props = hostProps();
    render(<AdminPageWrapper gameState={custom()} {...props} />);
    expect(screen.queryByRole("group", { name: "Board page" })).toBeNull();
    expect(screen.getByText("Smith Family Feud")).toBeInTheDocument();
    expect(screen.getByText("Closest Wins")).toBeInTheDocument();
    expect(screen.queryByText("Guess That Word")).toBeNull();

    // Row order: the first $100 is the first column.
    click(screen.getAllByRole("button", { name: "$100" })[0]);
    expect(props.handleUpdateCurrentGame).toHaveBeenCalledWith(GameName.FAMILY_FEUD, 100);
  });

  it("TV: shows the same custom columns", () => {
    render(<PageWrapper gameState={custom()} />);
    expect(screen.getByText("Smith Family Feud")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "$100" })).toHaveLength(2);
  });
});

describe("board layout per screen", () => {
  // The TV's board stretches to fill the screen at lg: (tiles drop their
  // vertical padding); the host's board must not, or its tiles get squashed.
  it("stretches tiles on the TV only", () => {
    const { unmount } = render(<PageWrapper gameState={roomState()} />);
    expect(screen.getAllByRole("button", { name: "$100" })[0].className).toContain("lg:py-0");
    unmount();
    render(<AdminPageWrapper gameState={roomState()} {...hostProps()} />);
    expect(screen.getAllByRole("button", { name: "$100" })[0].className).not.toContain("lg:py-0");
  });
});

describe("a smaller custom board", () => {
  const fourRows = (isDoubleJeopardy = false) =>
    roomState({
      isDoubleJeopardy,
      board: [
        {
          id: "custom",
          label: "Exult",
          columns: [
            { title: "Family Feud", game: "feud" },
            { title: "Head to Head", game: "head" },
          ],
          values: [100, 200, 300, 400],
        },
      ],
      boardPage: "custom",
    });
  const tileLabels = () =>
    screen.getAllByRole("button").map((b) => b.textContent).filter((t) => t?.startsWith("$"));

  it("shows only its rows: $100–$400, doubled in Double Jeopardy", () => {
    const { unmount } = render(<PageWrapper gameState={fourRows()} />);
    expect(tileLabels()).toEqual(["$100", "$100", "$200", "$200", "$300", "$300", "$400", "$400"]);
    unmount();
    render(<PageWrapper gameState={fourRows(true)} />);
    expect(tileLabels()).toEqual(["$200", "$200", "$400", "$400", "$600", "$600", "$800", "$800"]);
  });
});

describe("Double Jeopardy toggle", () => {
  it("is on the host page unless the pack plays a single round", () => {
    const { unmount } = render(<AdminPageWrapper gameState={roomState()} {...hostProps()} />);
    expect(screen.getByRole("button", { name: /Double Jeopardy: OFF/ })).toBeInTheDocument();
    unmount();
    render(<AdminPageWrapper gameState={roomState({ noDoubleJeopardy: true })} {...hostProps()} />);
    expect(screen.queryByRole("button", { name: /Double Jeopardy/ })).toBeNull();
  });
});

describe("awarding a mixed tile", () => {
  it("marks its board column's tile, not the game it played as", () => {
    const props = hostProps();
    const state = onTile(roomState({ boardPage: "party" }), GameName.SCAVENGER, 300);
    state.currentGame.column = "head";
    render(<AdminPageWrapper gameState={state} {...props} />);
    click(screen.getByRole("button", { name: /Add 300 points to Team A/ }));
    expect(props.handleAddPoints).toHaveBeenCalledWith(expect.anything(), 300, "head", expect.anything());
  });
});

describe("a Minute challenge inside another category", () => {
  const minuteState = (column: string | undefined, promptVisible: boolean) => {
    const state = roomState({
      gameData: {
        ...roomState().gameData,
        minute: { 300: { title: "Stick the Landing", link: "", materials: [], description: "" } },
      },
    });
    state.currentGame = {
      gameName: GameName.MINUTE,
      gameTitle: column ? "Head to Head" : "Minute To Win It",
      value: 300,
      questionState: { promptVisible },
      ...(column ? { column } : {}),
    };
    return state;
  };

  it("keeps the category heading until the reveal, then switches to the real game", () => {
    const { rerender } = render(<PageWrapper gameState={minuteState("head", false)} />);
    expect(screen.getByRole("heading", { name: "Head to Head" })).toBeInTheDocument();
    expect(screen.getByText(/The challenge will be revealed soon/)).toBeInTheDocument();

    rerender(<PageWrapper gameState={minuteState("head", true)} />);
    expect(screen.getByRole("heading", { name: "Minute To Win It" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Head to Head" })).toBeNull();
    // The challenge itself keeps its plain name (no prefix).
    expect(screen.getByRole("heading", { name: "Stick the Landing" })).toBeInTheDocument();
  });

  it("leaves the regular Minute column as it was", () => {
    render(<PageWrapper gameState={minuteState(undefined, true)} />);
    expect(screen.getByRole("heading", { name: "Minute To Win It" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Stick the Landing" })).toBeInTheDocument();
  });
});

describe("host preview of a Minute challenge", () => {
  it("shows the name on the admin page before Next, not after", () => {
    const state = roomState({
      gameData: {
        ...roomState().gameData,
        minute: { 300: { title: "Stick the Landing", link: "", materials: [], description: "" } },
      },
    });
    state.currentGame = {
      gameName: GameName.MINUTE,
      gameTitle: "Head to Head",
      value: 300,
      questionState: { promptVisible: false },
      column: "head",
    };
    const { unmount } = render(<AdminPageWrapper gameState={state} {...hostProps()} />);
    expect(screen.getByText(/Up next:/)).toBeInTheDocument();
    expect(screen.queryByText(/host only/)).toBeNull();
    expect(screen.getByText("Minute to win it: Stick the Landing")).toBeInTheDocument();
    unmount();
    // The TV never shows it before the reveal.
    render(<PageWrapper gameState={state} />);
    expect(screen.queryByText(/Stick the Landing/)).toBeNull();
  });
});

describe("a mixed Scavenger Sprint tile on the TV", () => {
  it("is headed Scavenger Sprint once revealed, with the plain item", () => {
    const state = roomState({
      gameData: { ...roomState().gameData, scavenger: { 200: { item: "A rosary" } } },
    });
    state.currentGame = {
      gameName: GameName.SCAVENGER,
      gameTitle: "Head to Head",
      value: 200,
      questionState: { ...createInitialQuestionState(GameName.SCAVENGER, state.teams), promptVisible: true, itemRevealed: true } as any,
      column: "head",
    };
    render(<PageWrapper gameState={state} />);
    expect(screen.getByRole("heading", { name: "Scavenger Sprint" })).toBeInTheDocument();
    expect(screen.getByText("A rosary")).toBeInTheDocument();
  });
});

describe("Minute timer button", () => {
  it("is on every Minute challenge, video or not, and shows the timer", () => {
    const props = hostProps();
    const state = roomState({
      gameData: {
        ...roomState().gameData,
        minute: { 300: { title: "Box Stack", link: "", materials: [], description: "" } },
      },
    });
    state.currentGame = {
      gameName: GameName.MINUTE,
      gameTitle: "Head to Head",
      value: 300,
      questionState: { promptVisible: true },
      column: "head",
    };
    render(<AdminPageWrapper gameState={state} {...props} />);
    click(screen.getByRole("button", { name: "⏱ Show timer" }));
    expect(props.sendGameStateToServer).toHaveBeenCalledWith(
      expect.objectContaining({ showTimer: true, timerPlaying: false })
    );
  });
});
