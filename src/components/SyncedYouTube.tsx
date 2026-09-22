import React, { useEffect, useRef } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";

interface SyncedYouTubeProps {
  videoId: string;
  // Desired state, owned by the host and delivered through game state.
  playing: boolean;
  // Bumped by the host to rewind to the start.
  restartToken: number;
  className?: string;
}

// A YouTube embed the host controls remotely: it never decides anything
// itself, it just mirrors `playing` / `restartToken`. Note browsers refuse to
// start unmuted playback from a background event until the page has had a
// click, which the display's "enable sound" overlay covers.
const SyncedYouTube: React.FC<SyncedYouTubeProps> = ({
  videoId,
  playing,
  restartToken,
  className,
}) => {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const appliedRestart = useRef(restartToken);

  const apply = () => {
    const player = playerRef.current;
    if (!player) return;
    if (appliedRestart.current !== restartToken) {
      appliedRestart.current = restartToken;
      player.seekTo(0, true);
    }
    if (playing) {
      player.playVideo();
    } else {
      player.pauseVideo();
    }
  };

  // Re-apply whenever the host changes either value.
  useEffect(apply);

  return (
    <YouTube
      videoId={videoId}
      className={className}
      iframeClassName="w-full h-full"
      opts={{
        width: "100%",
        height: "100%",
        playerVars: { rel: 0, playsinline: 1 },
      }}
      onReady={(event: YouTubeEvent) => {
        playerRef.current = event.target;
        apply();
      }}
    />
  );
};

export default SyncedYouTube;
