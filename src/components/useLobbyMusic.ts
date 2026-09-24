import { useEffect, useRef } from "react";
import { lobbyMusicFiles } from "../shared/audio";
import { shuffleArray } from "../shared/slots";
import { createAudio, playAudio } from "../shared/sound";

// Plays the lobby tracks in a shuffled order while `active`, one after
// another, reshuffling after the last. Pausing keeps the place, so turning it
// back on resumes the same track. A new `shuffleToken` reshuffles and jumps to
// a different track. One Audio element, created through createAudio so the
// TV's mute and volume apply.
export function useLobbyMusic(active: boolean, shuffleToken = 0): void {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queue = useRef<string[]>([]);

  const nextTrack = (audio: HTMLAudioElement) => {
    if (queue.current.length === 0) queue.current = shuffleArray(lobbyMusicFiles);
    audio.src = queue.current.shift()!;
  };

  // Shuffle: a fresh order that doesn't start with the track playing now.
  const appliedShuffle = useRef(shuffleToken);
  useEffect(() => {
    if (appliedShuffle.current === shuffleToken) return;
    appliedShuffle.current = shuffleToken;
    const audio = audioRef.current;
    if (!audio) return; // not started yet: the first play is random anyway
    const current = audio.getAttribute("src");
    queue.current = shuffleArray(lobbyMusicFiles.filter((file) => file !== current));
    nextTrack(audio);
    if (active) playAudio(audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffleToken]);

  useEffect(() => {
    if (!active) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      const audio = createAudio();
      audio.addEventListener("ended", () => {
        nextTrack(audio);
        playAudio(audio);
      });
      nextTrack(audio);
      audioRef.current = audio;
    }
    playAudio(audioRef.current);
  }, [active]);

  // Stop for good when the TV page goes away.
  useEffect(
    () => () => {
      audioRef.current?.pause();
      audioRef.current = null;
    },
    []
  );
}
