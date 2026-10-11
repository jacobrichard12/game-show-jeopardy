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
import { createAudio, playAudio } from "../shared/sound";
import { havePointsBeenAwarded } from "./AddPointsButtons";
import NoQuestionAvailable from "./NoQuestionAvailable";

interface MillionaireProps extends QuestionProps {}

const Millionaire: React.FC<MillionaireProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const audioRef = useRef(createAudio());

  const [correctAudio] = useState(() => createAudio(getRandomAudio(happyFiles)));
  const [incorrectAudio] = useState(() => createAudio(getRandomAudio(sadFiles)));

  const questionState = gameState.currentGame
    .questionState as MillionaireQuestionState;

  // Soundtrack plays from the display side only (isAdmin=false), restarting
  // fresh on each new subquestion — see FamilyFeud.tsx's doc comment for why
  // sounds react to broadcast state here rather than playing directly from
  // the admin's click handlers below.
  useEffect(() => {
    if (isAdmin) return;
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    audio.src = getRandomAudio(millionaireSoundtrackFiles);
    audio.play().catch((err) => console.error("Error playing audio:", err));

    return () => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
    };
  }, [isAdmin, questionState.questionIdx]);

  // Any award button (a team's points or "No One Gets Points") ends the
  // tile, so the soundtrack stops on the TV.
  const pointsAwarded = !!havePointsBeenAwarded(gameState);
  useEffect(() => {
    if (isAdmin || !pointsAwarded) return;
    audioRef.current.pause();
  }, [isAdmin, pointsAwarded]);

  const questionData = getCurrentQuestion(
    gameState.gameData.millionaire,
    gameState
  );

  const currentSubquestion =
    questionData?.questions[questionState.questionIdx];

  // Correct/incorrect sting when an answer is newly selected (not on every
  // render — only the transition from "no answer yet" to "answered").
  const prevAnsweredIdx = useRef(questionState.answeredQuestionIdx);
  useEffect(() => {
    const prev = prevAnsweredIdx.current;
    const current = questionState.answeredQuestionIdx;
    prevAnsweredIdx.current = current;

    if (isAdmin || !currentSubquestion) return;
    if (prev === undefined && current !== undefined) {
      const audio = audioRef.current;
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
      }
      if (current === currentSubquestion.correctAnswerIdx) {
        playAudio(correctAudio);
      } else {
        playAudio(incorrectAudio);
      }
    }
  }, [isAdmin, questionState.answeredQuestionIdx, currentSubquestion, correctAudio, incorrectAudio]);

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
      // Soundtrack restart for the new subquestion happens in the effect
      // above (keyed on questionIdx), on the display side only.
    }
  };

  const prefix = ["a.", "b.", "c.", "d."];

  return (
    <div className="millionaire-container">
      {questionState.promptVisible && (
        <div>
          {/* Display the category */}
          <h2 className="text-lg sm:text-xl md:text-2xl xl:text-4xl font-semibold mb-2 text-center">
            Category: {currentSubquestion.category}
          </h2>

          {/* Display the question */}
          <h1 className="text-2xl sm:text-3xl md:text-5xl xl:text-7xl font-bold mb-4 text-center">
            Question {questionState.questionIdx + 1}:{" "}
            {currentSubquestion.question}
          </h1>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mx-auto max-w-xl xl:max-w-5xl px-2">
        {currentSubquestion.answers.map((answer, index) => {
          let buttonClass =
            "border-2 p-2 sm:p-4 xl:p-6 text-base sm:text-xl md:text-3xl xl:text-5xl rounded-full shadow-md text-left px-5 sm:px-8 transition-colors ";
          const isRevealed = index < questionState.revealedAnswers;
          const isSelected = index === questionState.answeredQuestionIdx;

          if (hasAnswerBeenSelected()) {
            if (isSelected) {
              buttonClass += isSelectionCorrect(index)
                ? "bg-green-500 border-green-200 text-white"
                : "bg-red-600 border-red-300 text-white";
            } else if (questionState.showCorrectAnswer) {
              buttonClass += isSelectionCorrect(index)
                ? "bg-green-500 border-green-200 text-white"
                : "bg-red-600 border-red-300 text-white";
            } else {
              buttonClass += "bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed";
            }
          } else if (!isRevealed) {
            buttonClass += "bg-slate-800 border-slate-600 text-slate-500 cursor-not-allowed";
          } else {
            buttonClass += "bg-gradient-to-b from-tile to-surface border-accent text-white hover:brightness-125";
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
              <span className="font-display font-semibold text-accent mr-3">{prefix[index].toUpperCase()}</span>
              {isRevealed ? (
                answer
              ) : isAdmin ? (
                // The host sees unrevealed answers faintly, as the same text
                // they'll become, so revealing doesn't reflow the panel.
                <span className="opacity-60">{answer}</span>
              ) : (
                // The TV shows "???" over the invisible answer, stacked in one
                // grid cell, so the button is already its final size.
                <span className="inline-grid">
                  <span className="invisible col-start-1 row-start-1" aria-hidden="true">
                    {answer}
                  </span>
                  <span className="col-start-1 row-start-1">???</span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-4 flex flex-wrap justify-center gap-2 sm:gap-4 px-2">
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
