import React, { useEffect, useRef, useState } from "react";
import { BUZZER_LEVEL, buzzerAudio, tickAudio } from "../shared/audio";
import { useCountdown } from "../shared/countdown";
import { MAX_CLOCK_SECONDS, MIN_CLOCK_SECONDS, setClockSeconds } from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { ClockState } from "../shared/types";

interface CountdownClockProps {
  clock: ClockState;
  isAdmin: boolean;
  // Host-only: called with the new clock when the host starts/pauses/resets.
  onChange: (clock: ClockState) => void;
  // False hides the host's start button, for games that start the clock
  // from their own control (Scavenger Sprint's "show item").
  allowStart?: boolean;
}

// Big on-screen clock for the timed games. The host controls it; the TV just
// mirrors. Ticks in the last 5 seconds and a buzzer at zero come from the TV
// side only (same pattern as the other games: react to state, never play from
// the host's own click).
const CountdownClock: React.FC<CountdownClockProps> = ({
  clock,
  isAdmin,
  onChange,
  allowStart = true,
}) => {
  const remaining = useCountdown(clock);
  const seconds = Math.ceil(remaining / 1000);
  // Host-side text box for the clock length, before it's applied.
  const [secondsDraft, setSecondsDraft] = useState(String(clock.durationMs / 1000));

  const prevSeconds = useRef(seconds);
  useEffect(() => {
    const prev = prevSeconds.current;
    prevSeconds.current = seconds;
    if (isAdmin || !clock.running || seconds === prev) return;
    if (seconds === 0) playSound(buzzerAudio, BUZZER_LEVEL);
    else if (seconds <= 5) playSound(tickAudio);
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
  const draftSeconds = Number(secondsDraft);
  const draftValid = secondsDraft.trim() !== "" && Number.isFinite(draftSeconds);
  const applySeconds = () => {
    if (!draftValid) return;
    const next = setClockSeconds(clock, draftSeconds);
    setSecondsDraft(String(next.durationMs / 1000));
    onChange(next);
  };

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
      {/* TV only: on the host panel it would push the clock buttons down. */}
      {timeUp && !isAdmin && (
        <p className="mt-2 font-display text-2xl font-semibold uppercase tracking-widest text-red-400 sm:text-4xl xl:text-6xl">
          Time's up!
        </p>
      )}
      <div className="mx-auto mt-3 h-3 w-full max-w-2xl overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full ${urgent || timeUp ? "bg-red-500" : "bg-accent"}`}
          style={{ width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }}
        />
      </div>
      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {(allowStart || clock.running) && (
            <button
              onClick={toggle}
              disabled={!clock.running && remaining <= 0}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {clock.running ? "⏸ Pause clock" : "▶ Start clock"}
            </button>
          )}
          <button
            onClick={reset}
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            ↺ Reset clock
          </button>
          <span className="flex items-center gap-1">
            <input
              type="number"
              min={MIN_CLOCK_SECONDS}
              max={MAX_CLOCK_SECONDS}
              step={5}
              aria-label="Clock seconds"
              value={secondsDraft}
              disabled={clock.running}
              onChange={(e) => setSecondsDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applySeconds();
              }}
              className="w-20 rounded border p-2 text-gray-900 disabled:opacity-50"
            />
            <button
              onClick={applySeconds}
              disabled={clock.running || !draftValid}
              className="rounded bg-gray-200 px-3 py-2 text-gray-800 hover:bg-gray-300 disabled:opacity-50"
            >
              Set seconds
            </button>
          </span>
        </div>
      )}
    </div>
  );
};

export default CountdownClock;
