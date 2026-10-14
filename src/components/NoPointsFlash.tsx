import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { noPointsAudio } from "../shared/audio";
import { playSound } from "../shared/sound";
import { useFrameDocument } from "./frameContext";

const SHOW_MS = 2200;

// "No One Gets Points" on the TV: "No points!" rises in near the bottom of
// the screen, wobbles and sinks away, with a short sad sound. Triggered by GameState.noPointsCount going up (the
// ref starts at the current count, so a TV joining later stays quiet).
// Portaled to <body> like StrikeFlash, so FitToScreen's transform can't trap
// the fixed overlay.
const NoPointsFlash: React.FC<{ count: number }> = ({ count }) => {
  const [showing, setShowing] = useState(false);
  // The page's body, or a sandbox frame's.
  const doc = useFrameDocument();
  const prevCount = useRef(count);

  useEffect(() => {
    const prev = prevCount.current;
    prevCount.current = count;
    if (count <= prev) return;
    playSound(noPointsAudio);
    setShowing(true);
    const timer = setTimeout(() => setShowing(false), SHOW_MS);
    return () => clearTimeout(timer);
  }, [count]);

  if (!showing) return null;
  return createPortal(
    <div
      role="img"
      aria-label="No points"
      className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center pb-[22vh]"
    >
      <span className="rounded-2xl bg-black/60 px-8 py-3 font-display text-4xl font-bold text-white shadow-2xl sm:text-6xl xl:text-8xl motion-safe:animate-no-points">
        No points!
      </span>
    </div>,
    doc.body
  );
};

export default NoPointsFlash;
