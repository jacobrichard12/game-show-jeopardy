import React from "react";
import {
  MinuteQuestion,
  MinuteQuestions,
  MinuteQuestionState,
  QuestionProps,
} from "../shared/types";
import Timer from "./Timer";

interface MinuteProps extends QuestionProps {}

const Minute: React.FC<MinuteProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const value = gameState.currentGame.value;

  const allQuestions: MinuteQuestions = gameState.gameData.minute;
  let questionData: MinuteQuestion = allQuestions[value!];
  if (gameState.isDoubleJeopardy) {
    questionData = allQuestions[value! / 2 + 1];
  }

  const link = questionData.link;
  const title = questionData.title;

  // Extract the YouTube video ID from the link
  const videoId = link.split("v=")[1]?.split("&")[0]; // Get the video ID from the URL

  const questionState = gameState.currentGame
    .questionState as MinuteQuestionState;

  return (
    <div className="minute-container">
      {/* Title */}
      <h1 className="text-5xl font-bold mb-4 text-center">{title}</h1>

      {/* Video and Timer Layout */}
      <div
        className="video-timer-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
        }}
      >
        {/* Embed the YouTube video */}
        {videoId && !isAdmin && (
          <iframe
            width="800"
            height="600"
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
