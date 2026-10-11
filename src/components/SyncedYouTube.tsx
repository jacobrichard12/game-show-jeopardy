import React, { useEffect, useRef } from "react";
import YouTube, { YouTubeEvent, YouTubePlayer } from "react-youtube";
import { useMuted, useVolume } from "../shared/sound";

interface SyncedYouTubeProps {
  videoId: string;
  // Desired state, owned by the host and delivered through game state.
  playing: boolean;
  // Bumped by the host to rewind to the start.
  restartToken: number;
  className?: string;
}

// A YouTube embed the host controls remotely: it never decides anything
// itself, it just mirrors `playing` / `restartToken`, plus the display's own
// mute toggle and volume slider. Note browsers refuse to start unmuted
// playback from a background event until the page has had a click, which the
// display's "enable sound" overlay covers.
const SyncedYouTube: React.FC<SyncedYouTubeProps> = ({
  videoId,
  playing,
  restartToken,
  className,
}) => {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const appliedRestart = useRef(restartToken);
  const muted = useMuted();
  const volume = useVolume();

  // Player calls are queued promises that run once the iframe is ready. If
  // the embed is removed first (e.g. the host toggles the timer off right
  // after on), they reject with "Cannot read properties of null"; nothing
  // is left to control by then, so drop those failures.
  const call = (command: (player: YouTubePlayer) => unknown) => {
    const player = playerRef.current;
    if (!player) return;
    try {
      const result = command(player) as Promise<unknown> | undefined;
      if (result && typeof result.catch === "function") result.catch(() => {});
    } catch {
      // Same: the player went away mid-call.
    }
  };

  const apply = () => {
    if (!playerRef.current) return;
    if (appliedRestart.current !== restartToken) {
      appliedRestart.current = restartToken;
      call((player) => player.seekTo(0, true));
    }
    call((player) => (playing ? player.playVideo() : player.pauseVideo()));
  };

  const applySound = () => {
    // The IFrame API takes volume as 0–100.
    call((player) => player.setVolume(Math.round(volume * 100)));
    call((player) => (muted ? player.mute() : player.unMute()));
  };

  // Re-apply whenever the host changes either value.
  useEffect(apply);
  // Unmounting destroys the player; stop talking to it.
  useEffect(
    () => () => {
      playerRef.current = null;
    },
    []
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(applySound, [muted, volume]);

  // The host drives the video, so the TV needs none of YouTube's own UI:
  // no control bar (its title/gradient overlay then fades once playing), no
  // annotations or keyboard shortcuts, and a transparent shield over the
  // iframe so a parked mouse cursor never keeps the overlay up.
  return (
    <div className={`relative ${className ?? ""}`}>
      <YouTube
        videoId={videoId}
        className="w-full h-full"
        iframeClassName="w-full h-full"
        opts={{
          width: "100%",
          height: "100%",
          playerVars: {
            rel: 0,
            playsinline: 1,
            controls: 0,
            disablekb: 1,
            iv_load_policy: 3,
            fs: 0,
          },
        }}
        onReady={(event: YouTubeEvent) => {
          playerRef.current = event.target;
          applySound();
          apply();
        }}
      />
      <div data-testid="video-shield" aria-hidden="true" className="absolute inset-0" />
    </div>
  );
};

export default SyncedYouTube;
