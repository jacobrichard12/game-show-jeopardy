import React from "react";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { SandboxPack } from "../shared/types";
import Sandbox from "./Sandbox";

jest.mock("react-youtube", () => ({ __esModule: true, default: () => null }));
// The sandbox embeds the real host page and TV screen, which import the router.
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
  gameData: {
    charades: {
      "head:400": { words: [], shared: true },
      side: { category: "Reverse Charades", words: ["Halo", "Choir"] },
    },
  } as any,
  board: [
    {
      id: "custom",
      label: "Main",
      columns: [{ title: "Head to Head", game: "head", tiles: { "400": "charades" } }],
      values: [100, 200, 300, 400, 500],
    },
    { id: "custom-2", label: "Reverse Charades", columns: [], sideGame: "charades" },
  ],
  titleScreen: { title: "Night Games", subtitle: "Welcome!" },
  hideJoinCode: true,
  noDoubleJeopardy: true,
};

const tv = () => screen.getByLabelText("TV display");
const choose = (label: string, value: string) =>
  act(() => {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  });
const gameOption = (text: string) =>
  (Array.from(screen.getByLabelText("Game mode").querySelectorAll("option")) as HTMLOptionElement[]).find(
    (o) => o.textContent === text
  )!;

beforeEach(() => {
  mockEmitted.length = 0;
  window.sessionStorage.setItem("sandboxAdminToken", "secret");
  window.HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve()) as any;
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

describe("Sandbox with a content pack", () => {
  const loadPack = () => {
    render(<Sandbox />);
    act(() => listeners.packList({ packs: [{ id: "night", name: "Night" }] }));
    choose("Content", "night");
    expect(mockEmitted).toContainEqual(["sandboxPack", { adminToken: "secret", packId: "night" }]);
    act(() => listeners.sandboxPackResult({ ok: true, pack }));
  };

  it("plays a pack's mixed tile as its real game", () => {
    loadPack();
    choose("Game mode", gameOption("Head To Head").value);
    choose("Tile value", "400");
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /Next \(reveal to TV\)/ }));
    });
    // Head to Head $400 is Reverse Charades from the side game's list.
    expect(screen.getByRole("button", { name: "End turn" })).toBeInTheDocument();
    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Start Team A's turn" }));
    });
    expect(within(tv()).getByLabelText("Current word")).toHaveTextContent("Halo");
  });

  it("says what's on screen and shows only the controls that apply", () => {
    loadPack();
    choose("Game mode", gameOption("Head To Head").value);
    choose("Tile value", "400");
    expect(screen.getByText(/Night · Head to Head \$400 → plays as Reverse Charades/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Restart tile/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reset scores/ })).toBeInTheDocument();

    // The side game has no tile picker or tile actions.
    choose("Game mode", gameOption("Reverse Charades tab (side game)").value);
    expect(screen.queryByLabelText("Tile value")).toBeNull();
    expect(screen.queryByLabelText("Double Jeopardy")).toBeNull();
    expect(screen.queryByRole("button", { name: /Reset scores/ })).toBeNull();
    expect(screen.getByRole("button", { name: /↺ Restart$/ })).toBeInTheDocument();
    expect(screen.getByText(/Night · the Reverse Charades tab/)).toBeInTheDocument();
  });

  it("offers the pack's side game", () => {
    loadPack();
    choose("Game mode", gameOption("Reverse Charades tab (side game)").value);
    expect(screen.getByRole("button", { name: "Reset totals" })).toBeInTheDocument();
    expect(within(tv()).getByText("Get ready…")).toBeInTheDocument();
  });

  it("explains a rejected token", () => {
    render(<Sandbox />);
    act(() => listeners.packList({ packs: [{ id: "night", name: "Night" }] }));
    choose("Content", "night");
    act(() => listeners.sandboxPackResult({ ok: false, reason: "Invalid admin token." }));
    expect(screen.getByText("Invalid admin token.")).toBeInTheDocument();
  });
});
