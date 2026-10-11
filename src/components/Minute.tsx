import React from "react";
import {
  getCurrentQuestion,
  MinuteQuestionState,
  QuestionProps,
} from "../shared/types";
import SyncedYouTube from "./SyncedYouTube";
import NoQuestionAvailable from "./NoQuestionAvailable";


interface MinuteProps extends QuestionProps {}

const Minute: React.FC<MinuteProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const questionData = getCurrentQuestion(gameState.gameData.minute, gameState);

  if (!questionData) {
    return <NoQuestionAvailable />;
  }

  const title = questionData.title;
  const questionState = gameState.currentGame
    .questionState as MinuteQuestionState;
  const playing = questionState.videoPlaying ?? false;

  // Host controls for the video on the display screen.
  const updateVideo = (changes: Partial<MinuteQuestionState>) => {
    if (!isAdmin) return;
    const updatedGameState = { ...gameState };
    updatedGameState.currentGame.questionState = {
      ...questionState,
      ...changes,
    };
    sendGameStateToServer(updatedGameState);
  };

  // Extract the YouTube video ID from the link
  const videoId = questionData.link.split("v=")[1]?.split("&")[0];

  return (
    <div className="minute-container">
      {/* Title */}
      <h1 className="text-4xl md:text-6xl xl:text-8xl font-bold mb-4 text-center">{title}</h1>

      {/* Video and Timer Layout */}
      <div className="flex justify-center items-center">
        {/* The video lives on the display; w-full + aspect-video (instead of
            a literal width/height) so it scales down on narrow screens. */}
        {videoId && !isAdmin && (
          <SyncedYouTube
            videoId={videoId}
            playing={playing}
            restartToken={questionState.videoRestart ?? 0}
            className="w-full max-w-3xl xl:max-w-6xl aspect-video"
          />
        )}
      </div>

      {/* A pack's Minute challenge may have no video: title only, and the
          host explains it (Toggle Timer is in the toolbar). */}
      {isAdmin && !videoId && (
        <p className="mt-4 text-center text-sm text-gray-600">
          No video for this challenge: explain it, and use the timer below.
        </p>
      )}
      {isAdmin && videoId && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => updateVideo({ videoPlaying: !playing })}
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              {playing ? "⏸ Pause video" : "▶ Play video"}
            </button>
            <button
              onClick={() =>
                updateVideo({
                  videoPlaying: false,
                  videoRestart: (questionState.videoRestart ?? 0) + 1,
                })
              }
              className="bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300"
            >
              ↺ Restart
            </button>
          </div>
          <p className="text-sm text-gray-500">
            Video on the display is {playing ? "playing" : "paused"}.
          </p>
        </div>
      )}

      {/* Every Minute challenge (any column, video or not) can bring up the
          countdown timer from here; same as the toolbar's Toggle Timer, whose
          Play/Pause/Restart then control it. */}
      {isAdmin && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() =>
              sendGameStateToServer({
                ...gameState,
                showTimer: !gameState.showTimer,
                timerPlaying: false,
                timerFullScreen: false,
              })
            }
            className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          >
            {gameState.showTimer ? "⏱ Hide timer" : "⏱ Show timer"}
          </button>
        </div>
      )}
    </div>
  );
};

export default Minute;
