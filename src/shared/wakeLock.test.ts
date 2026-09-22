import { renderHook } from "@testing-library/react";
import { useWakeLock } from "./wakeLock";

// Minimal stand-in for a WakeLockSentinel that can simulate the browser
// dropping the lock (as it does when the tab is hidden).
function makeSentinel() {
  const listeners: Array<() => void> = [];
  return {
    release: jest.fn(() => Promise.resolve()),
    addEventListener: jest.fn((_type: string, fn: () => void) => {
      listeners.push(fn);
    }),
    dropByBrowser: () => listeners.forEach((fn) => fn()),
  };
}

let visibility: DocumentVisibilityState = "visible";
const setVisibility = (value: DocumentVisibilityState) => {
  visibility = value;
  document.dispatchEvent(new Event("visibilitychange"));
};
// Let the async acquire() promise chain settle.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("useWakeLock", () => {
  let request: jest.Mock;
  let sentinels: ReturnType<typeof makeSentinel>[];

  beforeEach(() => {
    visibility = "visible";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => visibility,
    });
    sentinels = [];
    request = jest.fn(() => {
      const sentinel = makeSentinel();
      sentinels.push(sentinel);
      return Promise.resolve(sentinel);
    });
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    });
  });

  afterEach(() => {
    delete (navigator as any).wakeLock;
  });

  it("requests a screen lock when enabled", async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith("screen");
  });

  it("does nothing while disabled", async () => {
    renderHook(() => useWakeLock(false));
    await flush();
    expect(request).not.toHaveBeenCalled();
  });

  it("does not throw when the browser has no Wake Lock API", async () => {
    delete (navigator as any).wakeLock;
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
  });

  it("swallows a refused request", async () => {
    request.mockImplementationOnce(() => Promise.reject(new Error("NotAllowedError")));
    expect(() => renderHook(() => useWakeLock(true))).not.toThrow();
    await flush();
  });

  it("does not request while the tab is hidden, then acquires when it returns", async () => {
    visibility = "hidden";
    renderHook(() => useWakeLock(true));
    await flush();
    expect(request).not.toHaveBeenCalled();

    setVisibility("visible");
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("re-acquires after the browser drops the lock and the tab becomes visible again", async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    expect(request).toHaveBeenCalledTimes(1);

    // Tab hidden: browser releases the lock on its own.
    setVisibility("hidden");
    sentinels[0].dropByBrowser();
    setVisibility("visible");
    await flush();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("does not stack a second lock when visibility changes while one is held", async () => {
    renderHook(() => useWakeLock(true));
    await flush();
    setVisibility("visible");
    await flush();
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("releases the lock on unmount", async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    await flush();
    unmount();
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });

  it("releases a lock that resolves after unmount", async () => {
    const { unmount } = renderHook(() => useWakeLock(true));
    unmount(); // before the request promise settles
    await flush();
    expect(sentinels[0].release).toHaveBeenCalledTimes(1);
  });
});
