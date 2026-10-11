import { ROOM_IDLE_MS, shouldSweepRoom } from "./roomSweep";

const HOUR = 60 * 60 * 1000;

describe("shouldSweepRoom", () => {
  it("keeps a game alive across a day's gap (morning to evening)", () => {
    expect(shouldSweepRoom(0, 10 * HOUR, 0)).toBe(false);
    expect(ROOM_IDLE_MS).toBe(24 * HOUR);
  });

  it("never sweeps a room while any screen is connected", () => {
    expect(shouldSweepRoom(0, 72 * HOUR, 1)).toBe(false);
  });

  it("sweeps an abandoned room after 24 idle hours", () => {
    expect(shouldSweepRoom(0, 24 * HOUR + 1, 0)).toBe(true);
  });
});
