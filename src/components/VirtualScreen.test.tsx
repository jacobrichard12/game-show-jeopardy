import React from "react";
import { render, screen } from "@testing-library/react";
import VirtualScreen from "./VirtualScreen";

describe("VirtualScreen", () => {
  const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientWidth");
  const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
  afterEach(() => {
    if (originalWidth) Object.defineProperty(HTMLElement.prototype, "clientWidth", originalWidth);
    if (originalHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", originalHeight);
  });

  it("renders unscaled when there's no layout to measure", () => {
    render(<VirtualScreen>hello</VirtualScreen>);
    expect(screen.getByText("hello").getAttribute("style")).toBeNull();
  });

  it("scales a 1920x1080 screen to the available width", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 960 });
    render(<VirtualScreen>hello</VirtualScreen>);
    const inner = screen.getByText("hello");
    expect(inner.style.transform).toBe("scale(0.5)");
    expect(inner.style.width).toBe("1920px");
    // The outer box takes the scaled height, so the page flows around it.
    expect((inner.parentElement as HTMLElement).style.height).toBe("540px");
  });

  it("with auto height, takes the content's height, scaled", () => {
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 450 });
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get: () => 600 });
    render(
      <VirtualScreen width={900} height="auto">
        panel
      </VirtualScreen>
    );
    const inner = screen.getByText("panel");
    expect(inner.style.transform).toBe("scale(0.5)");
    expect(inner.style.height).toBe("");
    expect((inner.parentElement as HTMLElement).style.height).toBe("300px");
  });
});
