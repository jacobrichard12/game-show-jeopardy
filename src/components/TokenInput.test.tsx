import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import TokenInput from "./TokenInput";

describe("TokenInput", () => {
  it("hides the token until the eye button is pressed, and submits on Enter", () => {
    const onEnter = jest.fn();
    render(<TokenInput value="secret" onChange={() => {}} onEnter={onEnter} />);
    const input = screen.getByLabelText("Host token");
    expect(input).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "Show token" }));
    expect(input).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Hide token" }));
    expect(input).toHaveAttribute("type", "password");

    fireEvent.keyDown(input, { key: "Enter" });
    expect(onEnter).toHaveBeenCalled();
  });
});
