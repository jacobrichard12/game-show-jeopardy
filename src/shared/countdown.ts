import { useEffect, useState } from "react";
import { ClockState } from "./types";

// Live time left (ms) for a ClockState. While `running`, counts down locally
// from `remainingMs` starting the moment this screen sees the change — so the
// host and the TV stay in step without needing synchronized system clocks.
// While paused it just shows `remainingMs` as sent by the host.
export function useCountdown(clock: ClockState): number {
  const [remaining, setRemaining] = useState(clock.remainingMs);

  useEffect(() => {
    setRemaining(clock.remainingMs);
    if (!clock.running) return;

    const startedAt = Date.now();
    const base = clock.remainingMs;
    const id = setInterval(() => {
      const left = Math.max(0, base - (Date.now() - startedAt));
      setRemaining(left);
      if (left === 0) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
    // runId is included so a restart with an otherwise identical clock
    // re-arms the timer.
  }, [clock.running, clock.remainingMs, clock.runId]);

  return remaining;
}
