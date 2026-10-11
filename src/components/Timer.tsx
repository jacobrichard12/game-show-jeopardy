import React, { useState } from "react";
import SyncedYouTube from "./SyncedYouTube";

const timerLinks = [
  "https://www.youtube.com/watch?v=qLWVVnPfCEY",
  "https://www.youtube.com/watch?v=ebvtJCu33vM",
  "https://www.youtube.com/watch?v=Gz38y76agPw",
  "https://www.youtube.com/watch?v=QgR2YabHkgQ",
  "https://www.youtube.com/watch?v=-0KGhku_Zfw",
  "https://www.youtube.com/watch?v=X57WY16chYc",
  "https://www.youtube.com/watch?v=hBjVOAG8V3Y",
  "https://www.youtube.com/watch?v=ofx4rrSCIbk",
];

interface TimerProps {
  playing: boolean;
  restartToken: number;
  // Fill the question area instead of the corner box.
  fullScreen?: boolean;
  // The corner box sits in its positioned parent rather than the window
  // (the sandbox's TV panel).
  contained?: boolean;
}

const Timer: React.FC<TimerProps> = ({ playing, restartToken, fullScreen = false, contained = false }) => {
  // Pick a video once on mount so parent re-renders don't reload the iframe.
  const [videoId] = useState(() => {
    const randomLink = timerLinks[Math.floor(Math.random() * timerLinks.length)];
    return randomLink.split("v=")[1]?.split("&")[0];
  });

  // Normally a picture-in-picture box in the TV's top-right corner (the
  // join code has the top-left), so the question stays on screen under it.
  // Full screen fills the question area, centered (PageWrapper hides the
  // question meanwhile). Only class names change between the two, so the
  // iframe isn't reloaded and the countdown keeps its place.
  return (
    <div
      data-testid="timer-overlay"
      className={
        fullScreen
          ? "flex items-center justify-center px-4 lg:min-h-0 lg:flex-1"
          : contained
          ? "absolute right-2 top-2 z-30 w-[40%] overflow-hidden rounded-xl bg-black shadow-2xl ring-4 ring-accent"
          : "fixed right-2 top-2 z-30 w-[60vw] overflow-hidden rounded-2xl bg-black shadow-2xl ring-4 ring-accent sm:right-4 sm:top-4 sm:w-[45vw] lg:w-[34vw]"
      }
    >
      <SyncedYouTube
        videoId={videoId}
        playing={playing}
        restartToken={restartToken}
        // Full screen: as big as the area above the scores allows (sized by
        // its height at lg+, so it never pushes the scores down).
        className={
          fullScreen
            ? "w-full aspect-video lg:h-full lg:w-auto lg:max-w-full"
            : "w-full aspect-video"
        }
      />
    </div>
  );
};

export default Timer;
