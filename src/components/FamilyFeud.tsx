import React, { useState } from "react";
import familyFeudJson from "../data/familyFeud.json";
import buzzer from "../assets/buzzer.wav";
import ding from "../assets/yes-ding.mp3";
import {
  FamilyFeudQuestion,
  FamilyFeudQuestions,
  FamilyFeudQuestionState,
  QuestionProps,
} from "../types/common";

// If you use Font Awesome icons, make sure it's installed in your project
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";

interface FamilyFeudProps extends QuestionProps {}

const FamilyFeud: React.FC<FamilyFeudProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const value = gameState.currentGame.value;

  const allQuestions: FamilyFeudQuestions = familyFeudJson;

  let questionData: FamilyFeudQuestion = allQuestions[value!];
  if (gameState.isDoubleJeopardy) {
    questionData = allQuestions[value!/2+1];
  }

  const questionState = gameState.currentGame
    .questionState as FamilyFeudQuestionState;

  const revealedAnswers =
    questionState.revealedAnswers.length === 0
      ? Array(questionData.answers.length).fill(false)
      : questionState.revealedAnswers;

  const wrongGuesses = questionState.wrongGuesses || 0;

  const handleReveal = (index: number) => {
    if (!isAdmin) return;

    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as FamilyFeudQuestionState;

    if (revealedAnswers[index]) return;
    const audio = new Audio(ding);
    audio.play();

    revealedAnswers[index] = true;
    updatedQuestionState.revealedAnswers = revealedAnswers;
    sendGameStateToServer(updatedGameState);
  };

  // Function to play sound when button is clicked
  const wrongAnswer = () => {
    if (!isAdmin) return;

    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as FamilyFeudQuestionState;

    updatedQuestionState.wrongGuesses++;
    updatedGameState.currentGame.questionState = updatedQuestionState;
    sendGameStateToServer(updatedGameState); // Send updated state to server

    const audio = new Audio(buzzer); // Create audio object with sound
    audio.play(); // Play the sound
  };

  return (
    <div className="p-4">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-lg mx-auto">
        {isAdmin && (
          <p className="text-lg font-semibold mb-4">{questionData.prompt}</p>
        )}

        <ul className="space-y-4">
          {questionData.answers.map((answer, index) => (
            <li
              key={index}
              className={`p-4 border rounded-lg ${
                revealedAnswers[index] ? "bg-green-100" : "bg-gray-200"
              }`}
              onClick={() => (isAdmin ? handleReveal(index) : null)}
            >
              {revealedAnswers[index] || isAdmin
                ? answer
                : `${index + 1}`}
            </li>
          ))}
        </ul>

        {/* Admin-only play sound button */}
        {isAdmin && (
          <div className="mt-4">
            <button
              onClick={wrongAnswer}
              className="bg-red-500 text-white py-2 px-4 rounded"
            >
              Wrong Answer
            </button>
          </div>
        )}

        {/* Display red X's for wrong guesses */}
        <div className="mt-4 flex flex-wrap">
          {Array.from({ length: wrongGuesses }, (_, index) => (
            <div
              key={index}
              className="text-red-500 flex items-center space-x-2 mb-2"
            >
              <FontAwesomeIcon icon={faTimesCircle} size="5x" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FamilyFeud;
