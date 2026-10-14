import React from "react";
import { act, render, screen } from "@testing-library/react";
import Display from "./Display";
import GameBoard from "./GameBoard";
import { GameName, GameState } from "../shared/types";

// ---- Display (TV) wiring: a fake socket we can push states through. ----
const listeners: Record<string, (data: any) => void> = {};
const mockSocket = {
  connected: true,
  on: (event: string, fn: (data: any) => void) => {
    listeners[event] = fn;
  },
  off: () => {},
  emit: () => {},
};
jest.mock("./SocketContext", () => ({ useSocket: () => mockSocket }));
jest.mock("react-router-dom", () => ({ useParams: () => ({ code: "ABCD" }) }), { virtual: true });
// Stand-ins that just show what Display hands them.
// On the board it shows one tile (Feud $300) at a known spot on screen.
jest.mock("./PageWrapper", () => (props: { boardIntro?: number; gameState: any }) => (
  <div data-testid="page">
    intro:{props.boardIntro} screen:{props.gameState.currentGame.gameName}
    {props.gameState.currentGame.gameName === "board" && (
      <button
        data-tile="feud-300"
        ref={(el) => {
          if (el)
            el.getBoundingClientRect = () =>
              ({ left: 100, top: 200, width: 100, height: 50 } as DOMRect);
        }}
      />
    )}
  </div>
));
jest.mock("./TitlePage", () => () => <div>lobby</div>);
jest.mock("../shared/wakeLock", () => ({ useWakeLock: () => {} }));
// Records whether Display wants lobby music on, render by render.
const mockMusic: boolean[] = [];
jest.mock("./useLobbyMusic", () => ({ useLobbyMusic: (on: boolean) => mockMusic.push(on) }));

const state = (overrides: Partial<GameState> = {}): GameState =>
  ({
    started: true,
    teams: [{ id: "team-1", name: "A", score: 0 }],
    currentGame: { gameName: GameName.BOARD, gameTitle: "GameBoard", value: 0, questionState: { promptVisible: false } },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: {},
    ...overrides,
  } as unknown as GameState);

const push = (gs: GameState) => act(() => listeners.gameStateUpdate({ code: "ABCD", gameState: gs }));
const join = (gs: GameState) => act(() => listeners.gameJoined({ code: "ABCD", gameState: gs }));
const feud300 = { gameName: GameName.FAMILY_FEUD, gameTitle: "Family Feud", value: 300, questionState: { promptVisible: false } };

describe("Display reveal animations", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Skip the "enable sound" overlay.
    Object.defineProperty(navigator, "userActivation", { value: { hasBeenActive: true }, configurable: true });
  });
  afterEach(() => jest.useRealTimers());

  it("flips up a category + value card when a tile is picked, then clears it", () => {
    render(<Display />);
    join(state());
    push(state({ currentGame: feud300 as any }));
    expect(screen.getByText("Family Feud")).toBeInTheDocument();
    expect(screen.getByText("$300")).toBeInTheDocument();
    // The board stays behind the card...
    expect(screen.getByTestId("page")).toHaveTextContent("screen:board");
    // ...which starts on the picked tile: its centre (150, 225) minus the
    // card's centre (512, 384) on jsdom's 1024x768 window, and its size.
    const card = screen.getByText("$300").parentElement!;
    expect(card.style.getPropertyValue("--zoom-x")).toBe("-362px");
    expect(card.style.getPropertyValue("--zoom-y")).toBe("-159px");
    expect(Number(card.style.getPropertyValue("--zoom-sx"))).toBeCloseTo(100 / 819.2);
    expect(Number(card.style.getPropertyValue("--zoom-sy"))).toBeCloseTo(50 / 460.8);
    act(() => jest.advanceTimersByTime(1800));
    // ...and the question page shows once it's done.
    expect(screen.queryByText("$300")).toBeNull();
    expect(screen.getByTestId("page")).toHaveTextContent("screen:feud");
  });

  it("uses the tile's own colors: regular, then Double Jeopardy", () => {
    render(<Display />);
    join(state());
    push(state({ currentGame: feud300 as any }));
    expect(screen.getByText("$300").parentElement!.className).toContain("bg-tile");
    expect(screen.getByText("$300").className).toContain("text-accent");
    act(() => jest.advanceTimersByTime(1800));

    push(state({ isDoubleJeopardy: true }));
    act(() => jest.advanceTimersByTime(2600)); // the DOUBLE JEOPARDY! card
    push(state({ isDoubleJeopardy: true, currentGame: { ...feud300, value: 600 } as any }));
    expect(screen.getByText("$600").parentElement!.className).toContain("bg-dj-tile");
    expect(screen.getByText("$600").className).toContain("text-dj-accent");
  });

  it("clears the card if the host backs out to the board within 1.8 s", () => {
    render(<Display />);
    join(state());
    push(state({ currentGame: feud300 as any }));
    expect(screen.getByText("$300")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(500));
    push(state()); // back to the board
    expect(screen.queryByText("$300")).toBeNull();
    act(() => jest.advanceTimersByTime(5000));
    expect(screen.queryByText("$300")).toBeNull();
  });

  it("grows from the middle when the tile isn't on screen", () => {
    render(<Display />);
    join(state());
    push(state({ currentGame: { ...feud300, value: 500 } as any })); // no such stub tile
    const card = screen.getByText("$500").parentElement!;
    expect(card.style.getPropertyValue("--zoom-x")).toBe("");
  });

  it("shows no card for a TV that joins mid-question", () => {
    render(<Display />);
    join(state({ currentGame: feud300 as any }));
    expect(screen.queryByText("$300")).toBeNull();
  });

  // The intro number Display hands the board (0 = none).
  const intro = () => Number(/intro:(\d+)/.exec(screen.getByTestId("page").textContent!)![1]);

  it("plays the category intro on start, page switch, and after the Double Jeopardy card", () => {
    render(<Display />);
    join(state({ started: false }));
    push(state());
    const first = intro();
    expect(first).toBeGreaterThan(0);

    push(state({ boardPage: "party" }));
    expect(intro()).toBe(first + 1);

    push(state({ boardPage: "party", isDoubleJeopardy: true }));
    expect(intro()).toBe(first + 1); // the DOUBLE JEOPARDY! card first
    act(() => jest.advanceTimersByTime(2600));
    expect(intro()).toBe(first + 2);
  });

  it("keeps intro numbers increasing when the TV page remounts", () => {
    const firstTv = render(<Display />);
    join(state({ started: false }));
    push(state());
    const before = intro();
    firstTv.unmount();

    render(<Display />);
    join(state({ started: false }));
    push(state());
    expect(intro()).toBeGreaterThan(before); // not reset to 1, so the board plays it
  });

  it("wants lobby music only in the lobby, with the host's toggle on", () => {
    render(<Display />);
    join(state({ started: false }));
    expect(mockMusic[mockMusic.length - 1]).toBe(false); // off by default
    push(state({ started: false, lobbyMusic: true }));
    expect(mockMusic[mockMusic.length - 1]).toBe(true);
    push(state({ started: true, lobbyMusic: true })); // game started
    expect(mockMusic[mockMusic.length - 1]).toBe(false);
  });

  it("shows the break screen while paused, with lobby music if it's on, then the board again", () => {
    render(<Display />);
    join(state());
    push(state({ paused: true, pauseMessage: "See you tonight at 7!", lobbyMusic: true }));
    expect(screen.getByText("We'll be right back!")).toBeInTheDocument();
    expect(screen.getByText("See you tonight at 7!")).toBeInTheDocument();
    expect(screen.queryByTestId("page")).toBeNull();
    expect(mockMusic[mockMusic.length - 1]).toBe(true);

    push(state({ paused: false, lobbyMusic: true }));
    expect(screen.queryByText("We'll be right back!")).toBeNull();
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(mockMusic[mockMusic.length - 1]).toBe(false);
  });

  it("hides the in-game join code when the pack asks", () => {
    render(<Display />);
    join(state());
    expect(screen.getByText(/Join:/)).toBeInTheDocument();
    push(state({ hideJoinCode: true }));
    expect(screen.queryByText(/Join:/)).toBeNull();
  });

  it("doesn't replay the intro for a TV that joins a running game", () => {
    render(<Display />);
    join(state());
    expect(screen.getByTestId("page")).toHaveTextContent("intro:0");
  });
});

// ---- GameBoard: headers animate once per intro. ----
describe("GameBoard category intro", () => {
  const board = {
    feud: { gameName: "feud", gameTitle: "Family Feud", points: [100] },
    minute: { gameName: "minute", gameTitle: "Minute To Win It", points: [100] },
  };
  const renderBoard = (introKey: number) =>
    render(
      <GameBoard
        isAdmin={false}
        introKey={introKey}
        gameState={state()}
        gameBoardData={board}
        handleUpdateCurrentGame={() => {}}
        sendGameStateToServer={() => {}}
      />
    );
  const header = (title: string) => screen.getByText(title);

  it("staggers the headers for a new intro and doesn't replay it on remount", () => {
    const first = renderBoard(101);
    expect(header("Family Feud").className).toContain("animate-category-intro");
    expect(header("Minute To Win It").style.animationDelay).toBe("300ms");
    first.unmount();

    // Back from a question: same intro, no replay.
    const again = renderBoard(101);
    expect(header("Family Feud").className).not.toContain("animate-category-intro");

    // A new intro while the board is up plays again.
    again.rerender(
      <GameBoard
        isAdmin={false}
        introKey={102}
        gameState={state()}
        gameBoardData={board}
        handleUpdateCurrentGame={() => {}}
        sendGameStateToServer={() => {}}
      />
    );
    expect(header("Family Feud").className).toContain("animate-category-intro");
  });

  it("never animates without an intro (the host's board)", () => {
    renderBoard(0);
    expect(header("Family Feud").className).not.toContain("animate-category-intro");
  });
});
