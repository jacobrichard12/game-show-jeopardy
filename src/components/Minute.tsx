import React from "react";
import minuteJson from "../data/minute.json";
import {
  MinuteQuestion,
  MinuteQuestions,
  MinuteQuestionState,
  QuestionProps,
} from "../types/common";

const timerLinks = [
  "https://www.youtube.com/watch?v=qLWVVnPfCEY",
  "https://www.youtube.com/watch?v=ebvtJCu33vM",
  "https://www.youtube.com/watch?v=Gz38y76agPw",
  "https://www.youtube.com/watch?v=QgR2YabHkgQ",
  "https://www.youtube.com/watch?v=8N-pOJIJI3Y",
  "https://www.youtube.com/watch?v=-0KGhku_Zfw",
];

interface MinuteProps extends QuestionProps {}

const Minute: React.FC<MinuteProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const value = gameState.currentGame.value;

  const allQuestions: MinuteQuestions = minuteJson;
  let questionData: MinuteQuestion = allQuestions[value!];
  if (gameState.isDoubleJeopardy) {
    questionData = allQuestions[value! / 2 + 1];
  }

  const randomLink = timerLinks[Math.floor(Math.random() * timerLinks.length)];

  const link = questionData.link;
  const title = questionData.title;

  // Extract the YouTube video ID from the link
  const videoId = link.split("v=")[1]?.split("&")[0]; // Get the video ID from the URL
  const timerVideoId = randomLink.split("v=")[1]?.split("&")[0];

  const questionState = gameState.currentGame.questionState as MinuteQuestionState;

  const handleReadyTimer = () => {
    if (!isAdmin) return; // Only admin can change the readyTimer
    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame.questionState as MinuteQuestionState;

    updatedQuestionState.readyTimer = true; // Set readyTimer to true
    sendGameStateToServer(updatedGameState); // Send the updated game state to the server
  };

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
        {videoId && !isAdmin && !questionState.readyTimer && (
          <iframe
            width="800"
            height="600"
            src={`https://www.youtube.com/embed/${videoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
        {/* Embed a random counter video */}
        {!isAdmin && questionState.readyTimer && (
          <iframe
            width="800"
            height="600"
            src={`https://www.youtube.com/embed/${timerVideoId}`}
            title="YouTube video player"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        )}
      </div>

      {/* Button to trigger readyTimer */}
      {isAdmin && !questionState.readyTimer && (
        <div className="text-center mt-4">
          <button
            onClick={handleReadyTimer}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Ready Timer
          </button>
        </div>
      )}
    </div>
  );
};

export default Minute;
