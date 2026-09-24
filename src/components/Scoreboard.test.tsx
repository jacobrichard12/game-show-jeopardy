import React from "react";
import { render } from "@testing-library/react";
import ScoreBoard from "./Scoreboard";
import { GameState } from "../shared/types";

const state = (score: number) =>
  ({
    started: true,
    teams: [
      { id: "team-1", name: "Smiths", score },
      { id: "team-2", name: "Joneses", score: 0 },
    ],
    isDoubleJeopardy: false,
    answered: {},
    doubleJeopardyAnswered: {},
  } as unknown as GameState);

describe("ScoreBoard sound on the TV", () => {
  let catchSpy: jest.Mock;
  let playSpy: jest.SpyInstance;

  beforeEach(() => {
    // Before the TV's "Enable sound" click, browsers reject play(). The
    // rejection must be caught, or the dev server shows an error overlay.
    catchSpy = jest.fn();
    playSpy = jest
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockImplementation(() => ({ catch: catchSpy } as unknown as Promise<void>));
  });
  afterEach(() => playSpy.mockRestore());

  it("catches a blocked cheer when a score changes", () => {
    const { rerender } = render(<ScoreBoard isAdmin={false} gameState={state(0)} />);
    rerender(<ScoreBoard isAdmin={false} gameState={state(200)} />);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(catchSpy).toHaveBeenCalledTimes(1);
  });

  it("stays silent on the host's copy", () => {
    const { rerender } = render(<ScoreBoard isAdmin gameState={state(0)} />);
    rerender(<ScoreBoard isAdmin gameState={state(200)} />);
    expect(playSpy).not.toHaveBeenCalled();
  });
});
