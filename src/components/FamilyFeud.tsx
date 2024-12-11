import React, { useEffect, useRef } from "react";
import familyFeudJson from "../data/familyFeud.json";
import {
  FamilyFeudQuestion,
  FamilyFeudQuestions,
  FamilyFeudQuestionState,
  QuestionProps,
} from "../types/common";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { buzzerAudio, dingAudio, familyFeudTheme } from "../types/audio";

interface FamilyFeudProps extends QuestionProps {}

const FamilyFeud: React.FC<FamilyFeudProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const audioRef = useRef(new Audio(familyFeudTheme));

  // Assign a random soundtrack if not already assigned
  useEffect(() => {
    if (!isAdmin) return;
    const audio = audioRef.current;

    const playAudio = async () => {
      try {
        if (audio.paused) {
          await audio.play();
        }
      } catch (err) {
        console.error("Error playing audio:", err);
      }
    };

    playAudio(); // Start playing the initial soundtrack

    return () => {
      // Stop the audio when the component unmounts
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0; // Reset to the beginning
      }
    };
  }, [isAdmin]);

  const value = gameState.currentGame.value;

  const allQuestions: FamilyFeudQuestions = familyFeudJson;

  let questionData: FamilyFeudQuestion = allQuestions[value!];
  if (gameState.isDoubleJeopardy) {
    questionData = allQuestions[value! / 2 + 1];
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
    const audio = new Audio(dingAudio);
    audio.play();

    revealedAnswers[index] = true;
    updatedQuestionState.revealedAnswers = revealedAnswers;
    sendGameStateToServer(updatedGameState);
  };

  const handleShowFeudPrompt = () => {
    if (!isAdmin) return;
    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as FamilyFeudQuestionState;

    updatedQuestionState.showFeudPrompt = true;
    updatedGameState.currentGame.questionState = updatedQuestionState;
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

    const audio = new Audio(buzzerAudio); // Create audio object with sound
    audio.play(); // Play the sound
  };

  return (
    <div className="p-4">
      <div className="bg-white shadow-md rounded-lg p-6 max-w-lg mx-auto">
        {questionState.showFeudPrompt && (
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
              {revealedAnswers[index] || isAdmin ? answer : `${index + 1}`}
            </li>
          ))}
        </ul>

        <div className="mt-4">
          {isAdmin && (
            <span className="flex space-x-4">
              <button
                onClick={wrongAnswer}
                className="bg-red-500 text-white py-2 px-4 rounded"
              >
                Wrong Answer
              </button>
              <button
                onClick={handleShowFeudPrompt}
                className="bg-blue-500 text-white py-2 px-4 rounded"
              >
                Show Feud Prompt
              </button>
            </span>
          )}
        </div>

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
