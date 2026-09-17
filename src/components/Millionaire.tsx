import React, { useEffect, useRef, useState } from "react";
import {
  getRandomAudio,
  happyFiles,
  millionaireSoundtrackFiles,
  sadFiles,
} from "../shared/audio";
import {
  getCurrentQuestion,
  MillionaireQuestionState,
  QuestionProps,
} from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

interface MillionaireProps extends QuestionProps {}

const Millionaire: React.FC<MillionaireProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const audioRef = useRef(new Audio());

  const [correctAudio] = useState(new Audio(getRandomAudio(happyFiles)));
  const [incorrectAudio] = useState(new Audio(getRandomAudio(sadFiles)));

  useEffect(() => {
    if (!isAdmin) return;
    const audio = audioRef.current;
    audio.src = getRandomAudio(millionaireSoundtrackFiles);
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

  const questionData = getCurrentQuestion(
    gameState.gameData.millionaire,
    gameState
  );

  const questionState = gameState.currentGame
    .questionState as MillionaireQuestionState;

  const currentSubquestion =
    questionData?.questions[questionState.questionIdx];

  // The slot object can exist while its sub-questions are missing (e.g. the
  // trivia API was rate-limited at startup), so guard the sub-question too.
  if (!questionData || !currentSubquestion) {
    return <NoQuestionAvailable />;
  }

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
      audio.src = getRandomAudio(millionaireSoundtrackFiles);
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
