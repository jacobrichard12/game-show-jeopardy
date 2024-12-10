import React from "react";
import minuteJson from "../data/headToHead.json";
import {
  HeadToHeadQuestion,
  HeadToHeadQuestions,
  HeadToHeadQuestionState,
  QuestionProps,
} from "../types/common";

interface HeadToHeadProps extends QuestionProps {}

const HeadToHead: React.FC<HeadToHeadProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const value = gameState.currentGame.value;

  const allQuestions: HeadToHeadQuestions = minuteJson;
  let questionData: HeadToHeadQuestion = allQuestions[value!];
  if (gameState.isDoubleJeopardy) {
    questionData = allQuestions[value! / 2 + 1];
  }

  const questionState = gameState.currentGame
    .questionState as HeadToHeadQuestionState;

  // Function to convert \n to <br />
  const formatAdminInfo = (adminInfo: string) => {
    return adminInfo.split("\n").map((str, index) => (
      <React.Fragment key={index}>
        {str}
        <br />
      </React.Fragment>
    ));
  };

  const handleShowTitle = () => {
    if (!isAdmin) return; // Only admin can change the readyTimer
    if (questionState.showTitle) return;
    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as HeadToHeadQuestionState;

    updatedQuestionState.showTitle = true;
    sendGameStateToServer(updatedGameState); // Send the updated game state to the server
  };

  return (
    <div className="minute-container">
      {/* Title */}
      {!isAdmin && questionState.questionVisible && (
        <h1 className="text-2xl font-bold mb-4 text-center">Players Per Team: {questionData.players}</h1>
      )}

      {!isAdmin && questionState.showTitle && (
        <h1 className="text-7xl font-bold mb-4 text-center">{questionData.title}</h1>
      )}

      {isAdmin && questionState.showTitle && (
        <h2 className="text-2xl font-bold mb-4 text-center">
          {/* Render adminInfo with newlines */}
          {formatAdminInfo(questionData.adminInfo)}
        </h2>
      )}

      {/* Button to trigger readyTimer */}
      {isAdmin && (
        <div className="text-center mt-4">
          <button
            onClick={handleShowTitle}
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            Show Title
          </button>
        </div>
      )}
    </div>
  );
};

export default HeadToHead;
