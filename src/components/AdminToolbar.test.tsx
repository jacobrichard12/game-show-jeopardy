import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import Admin from "./Admin";
import { GameName, GameState } from "../shared/types";

// Plays the server for the host page.
const listeners: Record<string, (data: any) => void> = {};
const mockEmitted: [string, any][] = [];
const mockSocket = {
  connected: true,
  on: (event: string, fn: (data: any) => void) => {
    listeners[event] = fn;
  },
  off: () => {},
  emit: (event: string, data: any) => {
    mockEmitted.push([event, data]);
  },
};
jest.mock("./SocketContext", () => ({
  useSocket: () => mockSocket,
  getStoredAdminKey: () => "key",
}));
jest.mock("react-router-dom", () => ({ useParams: () => ({ code: "ABCD" }) }), { virtual: true });
// Stands in for the board: one button that picks the Feud $100 tile.
jest.mock("./AdminPageWrapper", () => (props: { handleUpdateCurrentGame: (g: string, v: number) => void }) => (
  <button onClick={() => props.handleUpdateCurrentGame("feud", 100)}>pick feud 100</button>
));

const state = (overrides: Partial<GameState> = {}): GameState =>
  ({
    started: false,
    teams: [{ id: "team-1", name: "A", score: 0 }],
    currentGame: { gameName: GameName.BOARD, gameTitle: "GameBoard", value: 0, questionState: { promptVisible: false } },
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
    gameData: {},
    ...overrides,
  } as unknown as GameState);

const joinAs = (gs: GameState) =>
  act(() => {
    listeners.gameJoined({ code: "ABCD", gameState: gs });
    listeners.adminAuthResult({ isAdmin: true });
  });
const push = (gs: GameState) => act(() => listeners.gameStateUpdate({ code: "ABCD", gameState: gs }));
const button = (name: RegExp) => screen.queryByRole("button", { name });

describe("host toolbar", () => {
  beforeEach(() => {
    mockEmitted.length = 0;
  });

  it("in the lobby: music (off by default), no timer; Shuffle only while music is on", () => {
    render(<Admin />);
    joinAs(state());
    expect(button(/Music off/)).toBeInTheDocument();
    expect(button(/Shuffle/)).toBeNull();
    expect(button(/Toggle Timer/)).toBeNull();

    fireEvent.click(button(/Music off/)!);
    expect(mockEmitted[mockEmitted.length - 1][1].gameState.lobbyMusic).toBe(true);

    push(state({ lobbyMusic: true, lobbyMusicShuffle: 2 }));
    fireEvent.click(button(/Shuffle/)!);
    expect(mockEmitted[mockEmitted.length - 1][1].gameState.lobbyMusicShuffle).toBe(3);
  });

  it("no timer controls on the game-over page", () => {
    render(<Admin />);
    joinAs(state({ started: true, gameOver: true, showTimer: true }));
    expect(button(/Toggle Timer/)).toBeNull();
    // The timer's own buttons (the end screen has its own "Play again").
    expect(button(/^(⏸ Pause|▶ Play)$/)).toBeNull();
    expect(button(/^↺ Restart$/)).toBeNull();
  });

  it("no music controls on the game-over page, even if ended from the lobby", () => {
    render(<Admin />);
    joinAs(state({ started: false, gameOver: true, lobbyMusic: true }));
    expect(button(/Music/)).toBeNull();
    expect(button(/Shuffle/)).toBeNull();
  });

  it("once started: timer back, music controls gone", () => {
    render(<Admin />);
    joinAs(state({ started: true, lobbyMusic: true }));
    expect(button(/Toggle Timer/)).toBeInTheDocument();
    expect(button(/Music/)).toBeNull();
    expect(button(/Shuffle/)).toBeNull();
  });
});

describe("picking a tile", () => {
  beforeEach(() => {
    mockEmitted.length = 0;
  });
  const pickedTitle = () => {
    fireEvent.click(screen.getByRole("button", { name: "pick feud 100" }));
    return mockEmitted[mockEmitted.length - 1][1].gameState.currentGame.gameTitle;
  };

  it("uses the custom column's title on a custom board", () => {
    render(<Admin />);
    joinAs(
      state({
        started: true,
        board: [{ id: "custom", label: "Smith night", columns: [{ title: "Smith Family Feud", game: "feud" }] }],
        boardPage: "custom",
      })
    );
    expect(pickedTitle()).toBe("Smith Family Feud");
  });

  it("keeps the usual title on the Standard board", () => {
    render(<Admin />);
    joinAs(state({ started: true }));
    expect(pickedTitle()).toBe("Family Feud");
  });
});

describe("lobby Game setup", () => {
  beforeEach(() => {
    mockEmitted.length = 0;
  });
  const lastEmit = (event: string) => [...mockEmitted].reverse().find(([e]) => e === event)?.[1];

  it("is offered only in the lobby", () => {
    render(<Admin />);
    joinAs(state());
    expect(button(/Game setup/)).toBeInTheDocument();
    push(state({ started: true }));
    expect(button(/Game setup/)).toBeNull();
  });

  it("opens with the current setup, applies it, and closes when the new game arrives", () => {
    render(<Admin />);
    joinAs(
      state({
        teams: [
          { id: "team-1", name: "Smiths", score: 0 },
          { id: "team-2", name: "Joneses", score: 0 },
        ],
        theme: "classic",
      })
    );
    fireEvent.click(button(/Game setup/)!);
    const dialog = screen.getByRole("dialog", { name: "Game setup" });
    expect((screen.getByLabelText("Team A name") as HTMLInputElement).value).toBe("Smiths");
    expect(screen.getByRole("button", { name: /Classic/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.change(screen.getByLabelText("Team C name"), { target: { value: "Lees" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(lastEmit("reconfigureGame")).toEqual({
      code: "ABCD",
      teamCount: 3,
      teamNames: ["Smiths", "Joneses", "Lees"],
      theme: "classic",
    });
    expect(dialog).toBeInTheDocument(); // waits for the server

    push(state({ teams: [{ id: "team-1", name: "Smiths", score: 0 }] }));
    expect(screen.queryByRole("dialog", { name: "Game setup" })).toBeNull();
  });

  it("shows the server's reason when it refuses", () => {
    render(<Admin />);
    joinAs(state());
    fireEvent.click(button(/Game setup/)!);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    act(() => listeners.reconfigureError({ reason: 'Content pack "x" wasn\'t found.' }));
    expect(screen.getByText('Content pack "x" wasn\'t found.')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).not.toBeDisabled();
  });
});
