import React from "react";
import { render } from "@testing-library/react";
import { toThemeId } from "../shared/themes";
import { useTheme } from "./useTheme";

describe("toThemeId", () => {
  it("keeps known themes and falls back to Original", () => {
    expect(toThemeId("neon")).toBe("neon");
    expect(toThemeId(undefined)).toBe("original");
    expect(toThemeId("pink")).toBe("original");
    expect(toThemeId(3)).toBe("original");
  });
});

describe("useTheme", () => {
  const Probe: React.FC<{ theme: unknown }> = ({ theme }) => {
    useTheme(theme);
    return null;
  };
  const attr = () => document.documentElement.getAttribute("data-theme");

  it("sets the page theme while mounted and clears it after", () => {
    const { rerender, unmount } = render(<Probe theme="classic" />);
    expect(attr()).toBe("classic");
    rerender(<Probe theme="original" />);
    expect(attr()).toBeNull();
    rerender(<Probe theme="holiday" />);
    expect(attr()).toBe("holiday");
    unmount();
    expect(attr()).toBeNull();
  });
});
