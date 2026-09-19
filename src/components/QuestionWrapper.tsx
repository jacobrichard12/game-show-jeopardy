import React from "react";
import { GameState } from "../shared/types";

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
        <h1 className="text-2xl md:text-4xl lg:text-[clamp(1.5rem,4vh,3.5rem)] font-display font-semibold mb-2 text-accent">{gameState.currentGame.gameTitle}</h1>
        <p className="text-lg md:text-2xl lg:text-[clamp(1rem,2.5vh,2rem)] text-blue-100">{gameState.currentGame.value} Points</p>
      </div>
      <div className="bg-ink/70 text-white border-2 border-accent/50 p-4 rounded-xl shadow-lg">
        {questionVisible ? (
          <div className="question-content">{question}</div>
        ) : (
          <div className="flex justify-center items-center h-48 text-blue-200 italic">
            The question will be revealed soon...
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionWrapper;
