import React from "react";
import { GameState } from "../shared/types";

const BUTTON = "p-1.5 sm:p-2 text-xs sm:text-base text-white rounded";

// The host's timer buttons (the toolbar, and the sandbox's host panel):
// Toggle Timer, then Play/Pause, Restart and full screen while it's shown.
const TimerControls: React.FC<{
  gameState: GameState;
  sendGameStateToServer: (gameState: GameState) => void;
}> = ({ gameState, sendGameStateToServer }) => (
  <>
    <button
      type="button"
      onClick={() =>
        sendGameStateToServer({
          ...gameState,
          showTimer: !gameState.showTimer,
          // Each time the timer appears it starts paused, in the corner,
          // ready for the host to press play.
          timerPlaying: false,
          timerFullScreen: false,
        })
      }
      className={`${BUTTON} bg-green-500`}
    >
      Toggle Timer
    </button>
    {gameState.showTimer && (
      <>
        <button
          type="button"
          onClick={() => sendGameStateToServer({ ...gameState, timerPlaying: !gameState.timerPlaying })}
          className={`${BUTTON} bg-blue-500`}
        >
          {gameState.timerPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          type="button"
          onClick={() =>
            sendGameStateToServer({
              ...gameState,
              timerPlaying: false,
              timerRestart: (gameState.timerRestart ?? 0) + 1,
            })
          }
          className={`${BUTTON} bg-gray-500`}
        >
          ↺ Restart
        </button>
        <button
          type="button"
          onClick={() =>
            sendGameStateToServer({ ...gameState, timerFullScreen: !gameState.timerFullScreen })
          }
          className={`${BUTTON} bg-purple-500`}
        >
          {gameState.timerFullScreen ? "⧉ Timer in corner" : "⛶ Full-screen timer"}
        </button>
      </>
    )}
  </>
);

export default TimerControls;
