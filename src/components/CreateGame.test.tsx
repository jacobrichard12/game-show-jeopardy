import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import CreateGame from "./CreateGame";

const mockSocket = { emit: jest.fn(), on: jest.fn(), off: jest.fn() };

// react-router v7 doesn't resolve under CRA's Jest; the page only needs
// useNavigate.
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({ useNavigate: () => mockNavigate }), {
  virtual: true,
});

jest.mock("./SocketContext", () => ({
  useSocket: () => mockSocket,
  storeAdminKey: jest.fn(),
}));

describe("CreateGame team names", () => {
  beforeEach(() => mockSocket.emit.mockClear());

  const renderPage = () => render(<CreateGame />);

  it("shows one name field per team", () => {
    renderPage();
    expect(screen.getByLabelText("Team A name")).toBeTruthy();
    expect(screen.getByLabelText("Team B name")).toBeTruthy();
    expect(screen.queryByLabelText("Team C name")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "4" }));
    expect(screen.getByLabelText("Team D name")).toBeTruthy();
  });

  it("sends only the names for the chosen team count", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.change(screen.getByLabelText("Team A name"), {
      target: { value: "Smiths" },
    });
    fireEvent.change(screen.getByLabelText("Team C name"), {
      target: { value: "Joneses" },
    });
    // A name typed for a slot that's then removed isn't sent.
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));

    expect(mockSocket.emit).toHaveBeenCalledWith("createGame", {
      adminToken: "",
      teamCount: 2,
      teamNames: ["Smiths", ""],
      theme: "original",
    });
  });

  it("sends the chosen board theme", () => {
    renderPage();
    const classic = screen.getByRole("button", { name: /Classic/ });
    expect(screen.getByRole("button", { name: /Original/ })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(classic);
    expect(classic).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "createGame",
      expect.objectContaining({ theme: "classic" })
    );
  });
});

describe("CreateGame content pack", () => {
  // Captures the page's socket listeners so the test can play the server.
  const listeners: Record<string, (data: any) => void> = {};
  beforeEach(() => {
    mockSocket.emit.mockClear();
    mockSocket.on.mockImplementation((event: string, fn: (data: any) => void) => {
      listeners[event] = fn;
    });
  });
  afterEach(() => mockSocket.on.mockReset());

  it("asks for packs and hides the dropdown when there are none", () => {
    render(<CreateGame />);
    expect(mockSocket.emit).toHaveBeenCalledWith("listPacks", undefined);
    act(() => listeners.packList({ packs: [] }));
    expect(screen.queryByLabelText("Content pack")).toBeNull();
  });

  it("asks again with the typed token, so packs show only for the admin token", () => {
    jest.useFakeTimers();
    try {
      render(<CreateGame />);
      fireEvent.change(screen.getByLabelText("Host token"), { target: { value: "secret" } });
      expect(mockSocket.emit).not.toHaveBeenCalledWith("listPacks", { adminToken: "secret" });
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(mockSocket.emit).toHaveBeenCalledWith("listPacks", { adminToken: "secret" });
    } finally {
      jest.useRealTimers();
    }
  });

  it("defaults to None and sends the chosen pack", () => {
    render(<CreateGame />);
    act(() => listeners.packList({ packs: [{ id: "family", name: "Family night" }] }));
    const select = screen.getByLabelText("Content pack") as HTMLSelectElement;
    expect(select.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));
    expect(mockSocket.emit).toHaveBeenLastCalledWith(
      "createGame",
      expect.not.objectContaining({ packId: expect.anything() })
    );
    // The button says "Creating..." until the server answers.
    act(() => listeners.gameCreateError({ reason: "try again" }));

    fireEvent.change(select, { target: { value: "family" } });
    fireEvent.click(screen.getByRole("button", { name: "Create Game" }));
    expect(mockSocket.emit).toHaveBeenLastCalledWith(
      "createGame",
      expect.objectContaining({ packId: "family" })
    );
  });
});
