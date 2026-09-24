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
jest.mock("./AdminPageWrapper", () => () => <div>host page</div>);

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
