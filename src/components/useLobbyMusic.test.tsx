import React from "react";
import { render } from "@testing-library/react";
import { lobbyMusicFiles } from "../shared/audio";
import { useLobbyMusic } from "./useLobbyMusic";

describe("useLobbyMusic", () => {
  let played: string[];
  let playSpy: jest.SpyInstance;
  let pauseSpy: jest.SpyInstance;

  beforeEach(() => {
    played = [];
    playSpy = jest
      .spyOn(window.HTMLMediaElement.prototype, "play")
      .mockImplementation(function (this: HTMLMediaElement) {
        played.push(this.src);
        return Promise.resolve();
      });
    pauseSpy = jest.spyOn(window.HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });
  afterEach(() => {
    playSpy.mockRestore();
    pauseSpy.mockRestore();
  });

  let audio: HTMLAudioElement | null = null;
  const Probe: React.FC<{ active: boolean; shuffle?: number }> = ({ active, shuffle = 0 }) => {
    useLobbyMusic(active, shuffle);
    return null;
  };
  // Grab the element the hook creates, to fire "ended" on it.
  const captureAudio = () => {
    const original = window.Audio;
    jest.spyOn(window, "Audio").mockImplementation((src?: string) => {
      audio = new original(src);
      return audio;
    });
  };

  it("stays silent until switched on, and pausing keeps the track", () => {
    const { rerender } = render(<Probe active={false} />);
    expect(playSpy).not.toHaveBeenCalled();

    rerender(<Probe active />);
    expect(played).toHaveLength(1);
    rerender(<Probe active={false} />);
    expect(pauseSpy).toHaveBeenCalled();
    rerender(<Probe active />);
    expect(played[1]).toBe(played[0]); // resumes the same track
  });

  it("Shuffle jumps to a different track and plays it", () => {
    const { rerender } = render(<Probe active shuffle={0} />);
    const first = played[0];
    rerender(<Probe active shuffle={1} />);
    expect(played).toHaveLength(2);
    expect(played[1]).not.toBe(first);
  });

  it("plays every track once, in some order, before repeating", () => {
    captureAudio();
    render(<Probe active />);
    for (let i = 1; i < lobbyMusicFiles.length; i++) audio!.dispatchEvent(new Event("ended"));
    expect(played).toHaveLength(lobbyMusicFiles.length);
    expect(new Set(played).size).toBe(lobbyMusicFiles.length);
    audio!.dispatchEvent(new Event("ended")); // a new shuffle starts
    expect(played).toHaveLength(lobbyMusicFiles.length + 1);
  });
});
