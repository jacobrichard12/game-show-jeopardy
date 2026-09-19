import { useSyncExternalStore } from "react";

// Central place for sound: every Audio in the app is created through
// createAudio so a single mute toggle can silence all of them at once —
// including looping tracks that are already playing, which a per-call check
// couldn't reach.

const STORAGE_KEY = "soundMuted";

const readStoredMuted = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

let muted = readStoredMuted();
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
  if (instances.size > PRUNE_THRESHOLD) prune();
  instances.add(new WeakRef(audio));
  return audio;
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

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useMuted(): boolean {
  return useSyncExternalStore(subscribe, () => muted);
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
