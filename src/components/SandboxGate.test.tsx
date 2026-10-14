import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import SandboxGate from "./SandboxGate";

// Plays the server: answers each verifyAdminToken with `accept(token)`.
let accept: (token: string) => boolean = () => true;
const listeners: Record<string, (data: any) => void> = {};
// Plain functions, not jest.fn: CRA's Jest config resets mock
// implementations before every test.
const mockEmitted: [string, any][] = [];
const mockSocket = {
  on: (event: string, fn: (data: any) => void) => {
    listeners[event] = fn;
  },
  off: () => {},
  emit: (event: string, data: any) => {
    mockEmitted.push([event, data]);
    if (event === "verifyAdminToken") {
      const ok = accept(data.adminToken);
      setTimeout(() => act(() => listeners.adminTokenResult({ ok })), 0);
    }
  },
};

jest.mock("./SocketContext", () => ({ useSocket: () => mockSocket }));
jest.mock("./Sandbox", () => () => <div>SANDBOX PAGE</div>);
jest.mock("./SandboxDemo", () => () => <div>DEMO PAGE</div>);

describe("SandboxGate", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockEmitted.length = 0;
    window.sessionStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  const flush = () => act(() => jest.runOnlyPendingTimers());

  it("opens straight away when the server needs no token", () => {
    accept = () => true;
    render(<SandboxGate />);
    expect(screen.getByText("Checking access...")).toBeInTheDocument();
    flush();
    expect(screen.getByText("SANDBOX PAGE")).toBeInTheDocument();
  });

  it("guards the whole-game demo the same way", () => {
    accept = () => true;
    render(<SandboxGate page="demo" />);
    flush();
    expect(screen.getByText("DEMO PAGE")).toBeInTheDocument();
  });

  it("asks for the token, rejects a wrong one, and remembers a right one", () => {
    accept = (token) => token === "secret";
    render(<SandboxGate />);
    flush();
    expect(screen.queryByText("SANDBOX PAGE")).toBeNull();
    expect(screen.queryByText(/rejected/)).toBeNull(); // nothing typed yet

    const input = () => screen.getByLabelText("Admin token");
    fireEvent.change(input(), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    flush();
    expect(screen.getByText(/rejected/)).toBeInTheDocument();

    // The same wrong token again still gets an answer (no stuck "Checking").
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    flush();
    expect(screen.getByText(/rejected/)).toBeInTheDocument();

    fireEvent.change(input(), { target: { value: "secret" } });
    fireEvent.keyDown(input(), { key: "Enter" });
    flush();
    expect(screen.getByText("SANDBOX PAGE")).toBeInTheDocument();
    expect(window.sessionStorage.getItem("sandboxAdminToken")).toBe("secret");
  });

  it("uses the token remembered in this tab", () => {
    accept = (token) => token === "secret";
    window.sessionStorage.setItem("sandboxAdminToken", "secret");
    render(<SandboxGate />);
    flush();
    expect(mockEmitted).toContainEqual(["verifyAdminToken", { adminToken: "secret" }]);
    expect(screen.getByText("SANDBOX PAGE")).toBeInTheDocument();
  });
});
