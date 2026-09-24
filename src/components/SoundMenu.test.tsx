import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import SoundMenu from "./SoundMenu";
import { setMuted, setVolume } from "../shared/sound";

describe("SoundMenu", () => {
  afterEach(() => {
    act(() => {
      setMuted(false);
      setVolume(1);
    });
  });

  it("keeps the controls hidden until the button is clicked", () => {
    render(<SoundMenu />);
    expect(screen.queryByLabelText("Volume")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sound settings" }));
    expect(screen.getByLabelText("Volume")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Mute sound" })).toBeTruthy();
  });

  it("mutes and sets the volume from the menu", () => {
    render(<SoundMenu />);
    fireEvent.click(screen.getByRole("button", { name: "Sound settings" }));

    fireEvent.click(screen.getByRole("button", { name: "Mute sound" }));
    expect(screen.getByRole("button", { name: "Unmute sound" })).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Volume"), { target: { value: "40" } });
    expect((screen.getByLabelText("Volume") as HTMLInputElement).value).toBe("40");
  });

  it("closes on Escape and on a click outside", () => {
    render(<SoundMenu />);
    const toggle = screen.getByRole("button", { name: "Sound settings" });

    fireEvent.click(toggle);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByLabelText("Volume")).toBeNull();

    fireEvent.click(toggle);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByLabelText("Volume")).toBeNull();
  });
});
