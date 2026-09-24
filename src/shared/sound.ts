import { useSyncExternalStore } from "react";

// Central place for sound: every Audio in the app is created through
// createAudio so a single mute toggle and volume slider can reach all of them
// at once — including looping tracks that are already playing, which a
// per-call check couldn't reach. YouTube embeds aren't HTMLAudioElements, so
// SyncedYouTube follows useMuted()/useVolume() itself.

const STORAGE_KEY = "soundMuted";
const VOLUME_KEY = "soundVolume";

const readStoredMuted = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

// Volume is 0–1, like HTMLMediaElement.volume.
const clampVolume = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;

const readStoredVolume = (): number => {
  try {
    const stored = window.localStorage.getItem(VOLUME_KEY);
    return stored === null ? 1 : clampVolume(parseFloat(stored));
  } catch {
    return 1;
  }
};

let muted = readStoredMuted();
let volume = readStoredVolume();
const listeners = new Set<() => void>();

// Weak refs so short-lived one-shot sounds (and components that construct a
// throwaway Audio each render) can still be garbage collected.
const instances = new Set<WeakRef<HTMLAudioElement>>();
const PRUNE_THRESHOLD = 200;

const prune = () => {
  instances.forEach((ref) => {
    if (!ref.deref()) instances.delete(ref);
  });
};

export function createAudio(src?: string): HTMLAudioElement {
  const audio = src === undefined ? new Audio() : new Audio(src);
  audio.muted = muted;
  audio.volume = volume;
  if (instances.size > PRUNE_THRESHOLD) prune();
  instances.add(new WeakRef(audio));
  return audio;
}

// Fire-and-forget: plays a one-shot sound and swallows the rejection a browser
// raises when autoplay hasn't been unlocked yet (the display's "Enable sound"
// overlay handles that), so a blocked sound never becomes an unhandled error.
export function playSound(src: string): void {
  playAudio(createAudio(src));
}

// The same, for an Audio kept around to replay (e.g. created once in state).
// Never call .play() on a game sound directly: before the TV's "Enable sound"
// click its rejection is uncaught, which the dev server shows as an error
// overlay.
export function playAudio(audio: HTMLAudioElement): void {
  const result = audio.play();
  if (result && typeof result.catch === "function") result.catch(() => {});
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
  } catch {
    // Best-effort persistence.
  }
  prune();
  instances.forEach((ref) => {
    const audio = ref.deref();
    if (audio) audio.muted = value;
  });
  listeners.forEach((listener) => listener());
}

export function setVolume(value: number): void {
  volume = clampVolume(value);
  try {
    window.localStorage.setItem(VOLUME_KEY, String(volume));
  } catch {
    // Best-effort persistence.
  }
  prune();
  instances.forEach((ref) => {
    const audio = ref.deref();
    if (audio) audio.volume = volume;
  });
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, () => muted);
}

export function useVolume(): number {
  return useSyncExternalStore(subscribe, () => volume);
}

// Browsers block audio until the page has had a user gesture. True when one
// has already happened in this document (e.g. the click that navigated here
// from the join screen); when the API is unavailable, assume not.
export function hasUserActivation(): boolean {
  const activation = (navigator as Navigator & {
    userActivation?: { hasBeenActive: boolean };
  }).userActivation;
  return !!activation?.hasBeenActive;
}

// Tiny silent clip, played from inside a click handler to unlock playback.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export function unlockAudio(): void {
  const audio = new Audio(SILENT_WAV);
  audio.play().catch(() => {});
}
