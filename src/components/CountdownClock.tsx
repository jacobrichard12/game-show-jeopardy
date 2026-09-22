import React, { useEffect, useRef } from "react";
import { buzzerAudio, dingAudio } from "../shared/audio";
import { useCountdown } from "../shared/countdown";
import { playSound } from "../shared/sound";
import { ClockState } from "../shared/types";

interface CountdownClockProps {
  clock: ClockState;
  isAdmin: boolean;
  // Host-only: called with the new clock when the host starts/pauses/resets.
  onChange: (clock: ClockState) => void;
}

// Big on-screen clock for the timed games. The host controls it; the TV just
// mirrors. Ticks in the last 5 seconds and a buzzer at zero come from the TV
// side only (same pattern as the other games: react to state, never play from
// the host's own click).
const CountdownClock: React.FC<CountdownClockProps> = ({ clock, isAdmin, onChange }) => {
  const remaining = useCountdown(clock);
  const seconds = Math.ceil(remaining / 1000);

  const prevSeconds = useRef(seconds);
  useEffect(() => {
    const prev = prevSeconds.current;
    prevSeconds.current = seconds;
    if (isAdmin || !clock.running || seconds === prev) return;
    if (seconds === 0) playSound(buzzerAudio);
    else if (seconds <= 5) playSound(dingAudio);
  }, [seconds, isAdmin, clock.running]);

  const timeUp = seconds === 0;
  const urgent = !timeUp && seconds <= 10;
  const fraction = clock.durationMs > 0 ? remaining / clock.durationMs : 0;
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const toggle = () => {
    if (clock.running) {
      onChange({ ...clock, running: false, remainingMs: remaining, runId: clock.runId + 1 });
    } else if (remaining > 0) {
      onChange({ ...clock, running: true, remainingMs: remaining, runId: clock.runId + 1 });
    }
  };
  const reset = () =>
    onChange({ ...clock, running: false, remainingMs: clock.durationMs, runId: clock.runId + 1 });

  return (
    <div className="text-center">
      <p
        aria-label="Time remaining"
        className={`font-display font-semibold tabular-nums text-6xl sm:text-8xl xl:text-[10rem] leading-none ${
          timeUp ? "text-red-500" : urgent ? "text-red-400 animate-pulse" : "text-accent"
        }`}
      >
        {label}
      </p>
      <div className="mx-auto mt-3 h-3 w-full max-w-2xl overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${urgent || timeUp ? "bg-red-500" : "bg-accent"}`}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
      {isAdmin && (
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button
            onClick={toggle}
            disabled={!clock.running && remaining <= 0}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {clock.running ? "⏸ Pause clock" : "▶ Start clock"}
          </button>
          <button
            onClick={reset}
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            ↺ Reset clock
          </button>
        </div>
      )}
    </div>
  );
};

export default CountdownClock;
