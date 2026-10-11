import React from "react";
import { act, render } from "@testing-library/react";
import SyncedYouTube from "./SyncedYouTube";
import { setMuted, setVolume } from "../shared/sound";

const mockPlayer = {
  playVideo: jest.fn(),
  pauseVideo: jest.fn(),
  seekTo: jest.fn(),
  mute: jest.fn(),
  unMute: jest.fn(),
  setVolume: jest.fn(),
};

// Stand-in for the iframe: hands the fake mockPlayer over as soon as it mounts.
jest.mock("react-youtube", () => {
  const ReactLib = require("react");
  return {
    __esModule: true,
    default: ({ onReady }: { onReady: (e: unknown) => void }) => {
      ReactLib.useEffect(() => {
        onReady({ target: mockPlayer });
      }, []);
      return null;
    },
  };
});

describe("SyncedYouTube sound", () => {
  beforeEach(() => {
    Object.values(mockPlayer).forEach((fn) => fn.mockClear());
  });
  afterEach(() => {
    act(() => {
      setMuted(false);
      setVolume(1);
    });
  });

  it("starts muted and at the display's volume", () => {
    act(() => {
      setMuted(true);
      setVolume(0.3);
    });
    render(<SyncedYouTube videoId="abc" playing={false} restartToken={0} />);
    expect(mockPlayer.mute).toHaveBeenCalled();
    expect(mockPlayer.setVolume).toHaveBeenLastCalledWith(30);
  });

  it("follows mute and volume changes", () => {
    render(<SyncedYouTube videoId="abc" playing={false} restartToken={0} />);
    expect(mockPlayer.unMute).toHaveBeenCalled();

    act(() => setMuted(true));
    expect(mockPlayer.mute).toHaveBeenCalled();

    act(() => setVolume(0.55));
    expect(mockPlayer.setVolume).toHaveBeenLastCalledWith(55);
  });
});

describe("SyncedYouTube after the player is gone", () => {
  it("swallows a rejected player call instead of an unhandled error", async () => {
    // The real player rejects queued calls once its iframe is destroyed.
    const rejected = Promise.reject(new TypeError("Cannot read properties of null (reading 'playVideo')"));
    mockPlayer.playVideo.mockImplementation(() => rejected);
    const caught = jest.spyOn(rejected, "catch");
    render(<SyncedYouTube videoId="abc" playing restartToken={0} />);
    expect(mockPlayer.playVideo).toHaveBeenCalled();
    expect(caught).toHaveBeenCalled();
    await rejected.catch(() => {});
  });
});
