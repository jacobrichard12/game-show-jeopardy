import React from "react";
import { act, render, screen } from "@testing-library/react";
import StartTunnel, { TUNNEL_MS } from "./StartTunnel";
import TitleDecor from "./TitleDecor";

describe("StartTunnel", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows nothing until a start, then plays and clears itself", () => {
    const { rerender } = render(<StartTunnel tunnelKey={0} />);
    expect(screen.queryByTestId("start-tunnel")).toBeNull();

    rerender(<StartTunnel tunnelKey={1} />);
    // No decor: party emoji.
    expect(screen.getByTestId("start-tunnel")).toHaveTextContent("🎉");

    act(() => {
      jest.advanceTimersByTime(TUNNEL_MS);
    });
    expect(screen.queryByTestId("start-tunnel")).toBeNull();
  });

  it("uses the pack's decor", () => {
    render(<StartTunnel tunnelKey={1} decor="catholic-emoji" />);
    expect(screen.getByTestId("start-tunnel")).toHaveTextContent("🕊️");
    expect(screen.getByTestId("start-tunnel")).not.toHaveTextContent("🎉");
  });
});

describe("TitleDecor", () => {
  it("floats the decor's symbols, or nothing without one", () => {
    const { rerender, container } = render(<TitleDecor />);
    expect(screen.queryByTestId("title-decor")).toBeNull();

    rerender(<TitleDecor decor="catholic-emoji" />);
    expect(screen.getByTestId("title-decor")).toHaveTextContent("✝️");

    // Drawn icons render as SVGs.
    rerender(<TitleDecor decor="catholic-icons" />);
    expect(container.querySelectorAll("svg").length).toBeGreaterThan(0);

    // Clip art renders as images.
    rerender(<TitleDecor decor="catholic-clipart" />);
    expect(container.querySelectorAll("img").length).toBeGreaterThan(0);
  });
});
