import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { SandboxPack } from "../shared/types";
import SandboxDemo from "./SandboxDemo";

jest.mock("react-youtube", () => ({ __esModule: true, default: () => null }));
// The demo embeds the real host page and TV screen, which import the router.
jest.mock("react-router-dom", () => ({ useParams: () => ({}), useNavigate: () => () => {} }), { virtual: true });

// Plays the server: lists packs, answers sandboxPack.
const listeners: Record<string, (data: any) => void> = {};
const mockEmitted: [string, any][] = [];
const mockSocket = {
  on: (event: string, fn: (data: any) => void) => {
    listeners[event] = fn;
  },
  off: () => {},
  emit: (event: string, data: any) => {
    mockEmitted.push([event, data]);
  },
};
jest.mock("./SocketContext", () => ({
  useOptionalSocket: () => mockSocket,
  useSocket: () => mockSocket,
}));

const pack: SandboxPack = {
  id: "night",
  name: "Night",
  gameData: { charades: { side: { category: "Reverse Charades", words: ["Halo"] } } } as any,
  board: [
    { id: "custom", label: "Main", columns: [{ title: "Head to Head", game: "head" }], values: [100, 200, 300, 400, 500] },
    { id: "custom-2", label: "Reverse Charades", columns: [], sideGame: "charades" },
  ],
  titleScreen: { title: "Night Games", subtitle: "Welcome!" },
  hideJoinCode: true,
  noDoubleJeopardy: true,
};

const tv = () => screen.getByLabelText("TV display");
const host = () => screen.getByText("Host panel").closest("section") as HTMLElement;

beforeEach(() => {
  mockEmitted.length = 0;
  window.sessionStorage.setItem("sandboxAdminToken", "secret");
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve()) as any;
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

describe("Sandbox whole-game demo", () => {
  it("plays a pack through on the real host page and TV: title, start, board, pause, restart", () => {
    render(<SandboxDemo />);
    act(() => listeners.packList({ packs: [{ id: "night", name: "Night" }] }));
    act(() => {
      fireEvent.change(screen.getByLabelText("Content"), { target: { value: "night" } });
    });
    expect(mockEmitted).toContainEqual(["sandboxPack", { adminToken: "secret", packId: "night" }]);
    act(() => listeners.sandboxPackResult({ ok: true, pack }));

    // The pack's lobby, without the join code on the TV.
    expect(within(tv()).getByRole("heading", { name: "Night Games" })).toBeInTheDocument();
    expect(within(tv()).queryByText("DEMO")).toBeNull();
    // No Game setup (that needs a room), but Start Game.
    expect(within(host()).queryByRole("button", { name: /Game setup/ })).toBeNull();
    act(() => {
      fireEvent.click(within(host()).getByRole("button", { name: "Start Game" }));
    });

    // Both screens move to the board, with the pack's tabs on the host.
    expect(within(host()).getByRole("button", { name: "Reverse Charades" })).toBeInTheDocument();
    expect(within(tv()).getAllByText("Head to Head").length).toBeGreaterThan(0);

    act(() => {
      fireEvent.click(within(host()).getByRole("button", { name: /Pause game/ }));
    });
    expect(within(tv()).getByText("We'll be right back!")).toBeInTheDocument();

    // Restart: back to the lobby.
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Restart game/ }));
    });
    expect(within(tv()).getByRole("heading", { name: "Night Games" })).toBeInTheDocument();
  });

  it("runs on sample content without a pack, and team count starts over", () => {
    render(<SandboxDemo />);
    expect(within(tv()).getByRole("heading", { name: "Game Show Jeopardy" })).toBeInTheDocument();
    act(() => {
      fireEvent.change(screen.getByLabelText("Team count"), { target: { value: "3" } });
    });
    expect(within(tv()).getByText("Team C")).toBeInTheDocument();
  });
});
