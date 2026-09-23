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
    expect(screen.getByRole("button", { name: /Show item & start clock/ })).toBeInTheDocument();
    expect(screen.queryByText("Admin child content")).not.toBeInTheDocument();
  });
});
