import React, { useEffect, useRef, useState } from "react";
import millionaireJson from "../data/millionaire.json";
import soundtrack1 from "../assets/millionaire/sountrack-1.mp3";
import soundtrack2 from "../assets/millionaire/sountrack-2.mp3";
import soundtrack3 from "../assets/millionaire/sountrack-3.mp3";
import yay from "../assets/yay.mp3";  // New audio for correct answers
import oof from "../assets/oof.mp3"; // New audio for incorrect answers
import {
  MillionaireQuestion,
  MillionaireQuestions,
  MillionaireQuestionState,
  QuestionProps,
} from "../types/common";

interface MillionaireProps extends QuestionProps {}

const Millionaire: React.FC<MillionaireProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const audioRef = useRef(new Audio());
  const [correctAudio] = useState(new Audio(yay));
  const [incorrectAudio] = useState(new Audio(oof));

  const audioFiles = [soundtrack1, soundtrack2, soundtrack3];

  // Assign a random soundtrack if not already assigned
  useEffect(() => {
    if (!isAdmin) return;
    const audio = audioRef.current;
    audio.src = audioFiles[Math.floor(Math.random() * audioFiles.length)];

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

  const allQuestions: MillionaireQuestions = millionaireJson;
  let questionData: MillionaireQuestion = allQuestions[value!];
  if (gameState.isDoubleJeopardy) {
    questionData = allQuestions[value! / 2 + 1];
  }

  const questionState = gameState.currentGame
    .questionState as MillionaireQuestionState;

  const currentSubquestion = questionData.questions[questionState.questionIdx];

  const handleAnswerClick = (index: number) => {
    if (!isAdmin) return;
    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as MillionaireQuestionState;

    // Return if a question has already been selected
    if (updatedQuestionState.questionAnswerIdx) return;

    updatedQuestionState.questionAnswerIdx = index;
    updatedGameState.currentGame.questionState = updatedQuestionState;
    sendGameStateToServer(updatedGameState);

    // Stop the current background music
    const audio = audioRef.current;
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }

    // Play the correct or incorrect audio
    if (index === currentSubquestion.correctAnswerIdx) {
      correctAudio.play();
    } else {
      incorrectAudio.play();
    }
  };

  const highlightCorrectAnswer = () => {
    if (!isAdmin) return;
    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as MillionaireQuestionState;

    updatedQuestionState.questionAnswerIdx =
      currentSubquestion.correctAnswerIdx;
    updatedGameState.currentGame.questionState = updatedQuestionState;
    sendGameStateToServer(updatedGameState);
  };

  const revealNextAnswer = () => {
    if (!isAdmin) return;
    if (questionState.revealedAnswers < currentSubquestion.answers.length) {
      const updatedGameState = { ...gameState };
      const updatedQuestionState = updatedGameState.currentGame
        .questionState as MillionaireQuestionState;

      updatedQuestionState.revealedAnswers++;
      updatedGameState.currentGame.questionState = updatedQuestionState;
      sendGameStateToServer(updatedGameState);
    }
  };

  const nextSubquestion = () => {
    if (!isAdmin) return;
    if (questionState.questionIdx < questionData.questions.length - 1) {
      const updatedGameState = { ...gameState };
      const updatedQuestionState = updatedGameState.currentGame
        .questionState as MillionaireQuestionState;

      // Advance to the next subquestion
      updatedQuestionState.questionIdx++;
      updatedQuestionState.revealedAnswers = 0;
      updatedQuestionState.questionAnswerIdx = undefined;
      updatedGameState.currentGame.questionState = updatedQuestionState;
      sendGameStateToServer(updatedGameState);

      // Restart the audio when advancing to the next question
      const audio = audioRef.current;
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0; // Reset to the beginning
      }
      audio.src = audioFiles[Math.floor(Math.random() * audioFiles.length)];
      audio.play();
    }
  };

  const prefix = ["a.", "b.", "c.", "d."];

  return (
    <div className="millionaire-container">
      {/* Title */}
      {questionState.promptVisible && (
        <h1 className="text-2xl font-bold mb-4 text-center">
          Question {questionState.questionIdx + 1}:{" "}
          {currentSubquestion.question}
        </h1>
      )}

      {/* Choices in 2x2 grid */}
      <div className="grid grid-cols-2 gap-4 mx-auto max-w-xl">
        {currentSubquestion.answers.map((answer, index) => {
          let buttonClass = "border p-4 rounded-lg shadow-md text-left";
          if (index === questionState.questionAnswerIdx) {
            buttonClass +=
              index === currentSubquestion.correctAnswerIdx
                ? " bg-green-300" // Correct answer selected (highlighted green)
                : " bg-red-300"; // Incorrect answer selected (highlighted red)
          } else if (index < questionState.revealedAnswers) {
            buttonClass += " bg-blue-50"; // Revealed answer
          } else {
            buttonClass += " bg-gray-200"; // Default
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswerClick(index)}
              className={buttonClass}
              disabled={index >= questionState.revealedAnswers}
            >
              <span className="font-bold mr-2">{prefix[index]}</span>
              {index < questionState.revealedAnswers ? answer : "???"}
            </button>
          );
        })}
      </div>

      {/* Admin Buttons */}
      {isAdmin && (
        <div className="mt-4 flex justify-center space-x-4">
          <button
            onClick={revealNextAnswer}
            disabled={
              questionState.revealedAnswers >= currentSubquestion.answers.length
            }
            className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${
              questionState.revealedAnswers >= currentSubquestion.answers.length
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Reveal Next Answer
          </button>

          <button
            onClick={highlightCorrectAnswer}
            disabled={!questionState.questionAnswerIdx} // Disabled unless an answer has been selected
            className={`bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 ${
              !questionState.questionAnswerIdx
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Highlight Correct Answer
          </button>

          <button
            onClick={nextSubquestion}
            disabled={
              !questionState.questionAnswerIdx || questionState.questionIdx >= questionData.questions.length - 1
            } // Disabled unless an answer has been selected
            className={`bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 ${
              !questionState.questionAnswerIdx
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            Next Question
          </button>
        </div>
      )}
    </div>
  );
};

export default Millionaire;
