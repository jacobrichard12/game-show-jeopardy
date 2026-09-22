import { useEffect } from "react";

// The Wake Lock types aren't in this project's TypeScript (4.8) DOM lib, so
// declare just the slice used here — locally, rather than augmenting the global
// Navigator, so a future TypeScript upgrade that ships them can't conflict.
interface WakeLockSentinelLike {
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
}
interface NavigatorWithWakeLock extends Navigator {
  wakeLock: { request(type: "screen"): Promise<WakeLockSentinelLike> };
}

// Keeps the screen from dimming or sleeping while `enabled` — the TV view sits
// untouched for long stretches (nobody clicks a projector), so without this
// the OS idle timer blanks it mid-game even though the app is running fine.
//
// Uses the Screen Wake Lock API. Two things make it more than a one-liner:
//  - The browser silently drops the lock whenever the tab is hidden (switched
//    away from, minimized, or fully covered by another window), and never
//    gives it back on its own — so it's re-requested when the tab becomes
//    visible again.
//  - Requests can be refused (unsupported browser, insecure origin, low
//    battery), which must never break the game, so every failure is swallowed.
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !("wakeLock" in navigator)) {
      return;
    }

    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    let sentinel: WakeLockSentinelLike | null = null;
    let requesting = false;
    let cancelled = false;

    const acquire = async () => {
      // `requesting` stops a visibility change that lands mid-request from
      // stacking a second lock on top of the first.
      if (cancelled || requesting || sentinel || document.visibilityState !== "visible") {
        return;
      }
      requesting = true;
      try {
        const lock = await wakeLock.request("screen");
        if (cancelled) {
          // Unmounted while the request was in flight.
          lock.release().catch(() => {});
          return;
        }
        sentinel = lock;
        // Fires when the browser drops the lock (tab hidden, etc.); clearing
        // the reference is what lets the next visibilitychange re-acquire.
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
        });
      } catch {
        // Unsupported, refused, or not allowed right now — carry on without.
      } finally {
        requesting = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") acquire();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    acquire();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sentinel?.release().catch(() => {});
      sentinel = null;
    };
  }, [enabled]);
}
