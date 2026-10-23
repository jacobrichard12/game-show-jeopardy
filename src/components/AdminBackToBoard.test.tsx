import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { GameName, GameState } from "../shared/types";
import { AdminHost } from "./Admin";
import { freshFullGame } from "./sandboxContent";

jest.mock("react-youtube", () => ({ __esModule: true, default: () => null }));
jest.mock("react-router-dom", () => ({ useParams: () => ({}), useNavigate: () => () => {} }), { virtual: true });
const mockSocket = { on: () => {}, off: () => {}, emit: () => {} };
jest.mock("./SocketContext", () => ({
  useOptionalSocket: () => mockSocket,
  useSocket: () => mockSocket,
}));

describe("Back To Board", () => {
  it("puts the timer away", () => {
    const onTile: GameState = {
      ...freshFullGame(2, null, "original"),
      started: true,
      currentGame: { gameName: GameName.FAMILY_FEUD, gameTitle: "Feud", value: 200, questionState: { promptVisible: false } },
      showTimer: true,
      timerPlaying: true,
      timerFullScreen: true,
    } as GameState;
    const sent: GameState[] = [];
    render(<AdminHost code="TEST" gameState={onTile} sendGameStateToServer={(gs) => sent.push(gs)} onReset={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Back To Board" }));
    const after = sent[sent.length - 1];
    expect(after.currentGame.gameName).toBe(GameName.BOARD);
    expect(after).toMatchObject({ showTimer: false, timerPlaying: false, timerFullScreen: false });
  });
});
