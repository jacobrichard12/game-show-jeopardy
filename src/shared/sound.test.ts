import { createAudio, setMuted, setVolume } from "./sound";

describe("sound volume", () => {
  afterEach(() => {
    setVolume(1);
    setMuted(false);
  });

  it("applies the volume to existing and new audio", () => {
    const before = createAudio();
    setVolume(0.4);
    expect(before.volume).toBeCloseTo(0.4);
    expect(createAudio().volume).toBeCloseTo(0.4);
  });

  it("clamps out-of-range values", () => {
    setVolume(3);
    expect(createAudio().volume).toBe(1);
    setVolume(-1);
    expect(createAudio().volume).toBe(0);
    setVolume(NaN);
    expect(createAudio().volume).toBe(1);
  });

  it("remembers the volume", () => {
    setVolume(0.25);
    expect(window.localStorage.getItem("soundVolume")).toBe("0.25");
  });
});
