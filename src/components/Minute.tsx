import React from "react";
import { getCurrentQuestion, QuestionProps } from "../shared/types";
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

  // Extract the YouTube video ID from the link
  const videoId = questionData.link.split("v=")[1]?.split("&")[0];

  return (
    <div className="minute-container">
      {/* Title */}
      <h1 className="text-3xl md:text-5xl xl:text-7xl font-bold mb-4 text-center">{title}</h1>

      {/* Video and Timer Layout */}
      <div className="flex justify-center items-center">
        {/* Embed the YouTube video. w-full + aspect-video (instead of a
            literal width/height) so it scales down on narrow screens instead
            of overflowing and forcing horizontal scroll. */}
        {videoId && !isAdmin && (
          <iframe
            className="w-full max-w-3xl xl:max-w-6xl aspect-video"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
      </div>
    </div>
  );
};

export default Minute;
