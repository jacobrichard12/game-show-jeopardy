import { act, renderHook } from "@testing-library/react";
import { useCountdown } from "./countdown";
import { ClockState } from "./types";

const clock = (overrides: Partial<ClockState> = {}): ClockState => ({
  durationMs: 10000,
  remainingMs: 10000,
  running: false,
  runId: 0,
  ...overrides,
});

describe("useCountdown", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("shows the sent remaining time while paused", () => {
    const { result } = renderHook(() => useCountdown(clock({ remainingMs: 4200 })));
    expect(result.current).toBe(4200);
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(4200);
  });

  it("counts down locally while running", () => {
    const { result } = renderHook(() => useCountdown(clock({ running: true })));
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(7000);
  });

  it("stops at zero", () => {
    const { result } = renderHook(() => useCountdown(clock({ running: true, remainingMs: 1000 })));
    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(result.current).toBe(0);
  });

  it("freezes at the host's value when paused, and resumes from it", () => {
    const { result, rerender } = renderHook(({ c }) => useCountdown(c), {
      initialProps: { c: clock({ running: true }) },
    });
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    rerender({ c: clock({ running: false, remainingMs: 8000, runId: 1 }) });
    expect(result.current).toBe(8000);
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(8000);

    rerender({ c: clock({ running: true, remainingMs: 8000, runId: 2 }) });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(7000);
  });

  it("resets to the full duration", () => {
    const { result, rerender } = renderHook(({ c }) => useCountdown(c), {
      initialProps: { c: clock({ running: true }) },
    });
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    rerender({ c: clock({ running: false, remainingMs: 10000, runId: 1 }) });
    expect(result.current).toBe(10000);
  });
});
