import React, { useEffect, useRef, useState } from "react";
import soundtrack1 from "../assets/millionaire/sountrack-1.mp3";
import soundtrack2 from "../assets/millionaire/sountrack-2.mp3";
import soundtrack3 from "../assets/millionaire/sountrack-3.mp3";
import yay from "../assets/yay.mp3";
import oof from "../assets/oof.mp3";
import losing1 from "../assets/losing1.mp3";
import losing2 from "../assets/losing2.mp3";
import losing3 from "../assets/losing3.mp3";
import winning1 from "../assets/winning1.wav";
import winning2 from "../assets/winning2.wav";
import winning3 from "../assets/winning3.mp3";

import {
  MillionaireQuestion,
  MillionaireQuestions,
  MillionaireQuestionState,
  QuestionProps,
} from "../shared/types";

interface MillionaireProps extends QuestionProps {}

const Millionaire: React.FC<MillionaireProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const audioRef = useRef(new Audio());
  const soundtrackFiles = [soundtrack1, soundtrack2, soundtrack3];
  const sadFiles = [oof, losing1, losing2, losing3];
  const happyFiles = [yay, winning1, winning2, winning3];

  const getRandomFile = (files: string[]) => {
    return files[Math.floor(Math.random() * files.length)];
  };

  const [correctAudio] = useState(new Audio(getRandomFile(happyFiles)));
  const [incorrectAudio] = useState(new Audio(getRandomFile(sadFiles)));

  useEffect(() => {
    if (!isAdmin) return;
    const audio = audioRef.current;
    audio.src = getRandomFile(soundtrackFiles);
    const playAudio = async () => {
      try {
        if (audio.paused) {
          await audio.play();
        }
      } catch (err) {
        console.error("Error playing audio:", err);
      }
    };
    playAudio();

    return () => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [isAdmin]);

  const value = gameState.currentGame.value;
  const allQuestions: MillionaireQuestions = gameState.gameData.millionaire;
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

    if (updatedQuestionState.answeredQuestionIdx !== undefined) return;

    updatedQuestionState.answeredQuestionIdx = index;
    updatedGameState.currentGame.questionState = updatedQuestionState;
    sendGameStateToServer(updatedGameState);

    const audio = audioRef.current;
    if (!audio.paused) {
      audio.pause();
      audio.currentTime = 0;
    }

    if (index === currentSubquestion.correctAnswerIdx) {
      correctAudio.play();
    } else {
      incorrectAudio.play();
    }
  };

  const areAllAnswersRevealed = () =>
    questionState.revealedAnswers === currentSubquestion.answers.length;

  const isSelectionCorrect = (index: number) =>
    index === currentSubquestion.correctAnswerIdx;

  const hasAnswerBeenSelected = () =>
    questionState.answeredQuestionIdx !== undefined;

  const highlightCorrectAnswer = () => {
    if (!isAdmin) return;
    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as MillionaireQuestionState;

    updatedQuestionState.showCorrectAnswer =
      !updatedQuestionState.showCorrectAnswer;
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

      updatedQuestionState.questionIdx++;
      updatedQuestionState.revealedAnswers = 0;
      updatedQuestionState.answeredQuestionIdx = undefined;
      updatedQuestionState.showCorrectAnswer = false;
      updatedGameState.currentGame.questionState = updatedQuestionState;
      sendGameStateToServer(updatedGameState);

      const audio = audioRef.current;
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
      audio.src =
        soundtrackFiles[Math.floor(Math.random() * soundtrackFiles.length)];
      audio.play();
    }
  };

  const prefix = ["a.", "b.", "c.", "d."];

  return (
    <div className="millionaire-container">
      {questionState.promptVisible && (
        <div>
          {/* Display the category */}
          <h2 className="text-2xl font-semibold mb-2 text-center">
            Category: {currentSubquestion.category}
          </h2>

          {/* Display the question */}
          <h1 className="text-5xl font-bold mb-4 text-center">
            Question {questionState.questionIdx + 1}:{" "}
            {currentSubquestion.question}
          </h1>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 mx-auto max-w-xl">
        {currentSubquestion.answers.map((answer, index) => {
          let buttonClass =
            "border p-4 text-3xl rounded-lg shadow-md text-left ";
          const isRevealed = index < questionState.revealedAnswers;
          const isSelected = index === questionState.answeredQuestionIdx;

          if (hasAnswerBeenSelected()) {
            if (isSelected) {
              buttonClass += isSelectionCorrect(index)
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white";
            } else if (questionState.showCorrectAnswer) {
              buttonClass += isSelectionCorrect(index)
                ? "bg-green-500 text-white"
                : "bg-red-500 text-white";
            } else {
              buttonClass += "bg-gray-300 cursor-not-allowed";
            }
          } else if (!isRevealed) {
            buttonClass += "bg-gray-300 cursor-not-allowed";
          } else {
            buttonClass += "bg-blue-500 text-white hover:bg-blue-600";
          }

          return (
            <button
              key={index}
              onClick={() => handleAnswerClick(index)}
              className={buttonClass}
              disabled={
                !isRevealed ||
                hasAnswerBeenSelected() ||
                !areAllAnswersRevealed()
              }
            >
              <span className="font-bold mr-2">{prefix[index]}</span>
              {isRevealed ? answer : "???"}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-4 flex justify-center space-x-4">
          <button
            onClick={revealNextAnswer}
            disabled={areAllAnswersRevealed()}
            className={`bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 ${
              areAllAnswersRevealed() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Reveal Next Answer
          </button>

          <button
            onClick={highlightCorrectAnswer}
            disabled={!hasAnswerBeenSelected()}
            className={`bg-yellow-500 text-white py-2 px-4 rounded hover:bg-yellow-600 ${
              !hasAnswerBeenSelected() ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            Highlight Correct Answer
          </button>

          <button
            onClick={nextSubquestion}
            disabled={!hasAnswerBeenSelected() || !areAllAnswersRevealed()}
            className={`bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 ${
              !hasAnswerBeenSelected() ? "opacity-50 cursor-not-allowed" : ""
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
