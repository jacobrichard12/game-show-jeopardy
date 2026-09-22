import React, { useState } from "react";
import SyncedYouTube from "./SyncedYouTube";

const timerLinks = [
  "https://www.youtube.com/watch?v=qLWVVnPfCEY",
  "https://www.youtube.com/watch?v=ebvtJCu33vM",
  "https://www.youtube.com/watch?v=Gz38y76agPw",
  "https://www.youtube.com/watch?v=QgR2YabHkgQ",
  "https://www.youtube.com/watch?v=8N-pOJIJI3Y",
  "https://www.youtube.com/watch?v=-0KGhku_Zfw",
  "https://www.youtube.com/watch?v=X57WY16chYc",
  "https://www.youtube.com/watch?v=hBjVOAG8V3Y",
  "https://www.youtube.com/watch?v=ofx4rrSCIbk",
];

interface TimerProps {
  playing: boolean;
  restartToken: number;
}

const Timer: React.FC<TimerProps> = ({ playing, restartToken }) => {
  // Pick a video once on mount so parent re-renders don't reload the iframe.
  const [videoId] = useState(() => {
    const randomLink = timerLinks[Math.floor(Math.random() * timerLinks.length)];
    return randomLink.split("v=")[1]?.split("&")[0];
  });

  return (
    <div className="flex justify-around items-center px-4">
      <SyncedYouTube
        videoId={videoId}
        playing={playing}
        restartToken={restartToken}
        className="w-full max-w-3xl xl:max-w-6xl aspect-video"
      />
    </div>
  );
};

export default Timer;
