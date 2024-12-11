import React from "react";
import { GameState } from "../types/common";
import gameData from "../data/gameBoard.json";

interface QuestionWrapperProps {
  gameState: GameState;
  question: React.ReactNode;
}

const QuestionWrapper: React.FC<QuestionWrapperProps> = ({
  gameState,
  question,
}) => {
  const questionVisible = gameState.currentGame.questionState.promptVisible;

  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">{gameState.currentGame.gameTitle}</h1>
        <p className="text-lg text-gray-700">{gameState.currentGame.value} Points</p>
      </div>
      <div className="bg-white p-4 rounded shadow-lg">
        {questionVisible ? (
          <div className="question-content">{question}</div>
        ) : (
          <div className="flex justify-center items-center h-48 text-gray-500 italic">
            The question will be revealed soon...
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionWrapper;
