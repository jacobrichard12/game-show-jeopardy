import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  FamilyFeudQuestionState,
  getCurrentQuestion,
  QuestionProps,
} from "../shared/types";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { buzzerAudio, dingAudio, familyFeudTheme } from "../shared/audio";
import { createAudio } from "../shared/sound";
import NoQuestionAvailable from "./NoQuestionAvailable";

interface FamilyFeudProps extends QuestionProps {}

const FamilyFeud: React.FC<FamilyFeudProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const audioRef = useRef(createAudio(familyFeudTheme));

  // Play the theme + reveal/wrong-answer stings from the display side only
  // (isAdmin=false) so, on a single machine with both tabs open, sound
  // comes from the "watch" tab rather than the host's control panel. Both
  // sides render from the same broadcast state, so reacting to that state
  // here — instead of playing sounds directly inside the admin's click
  // handlers below — is what makes gating on isAdmin possible at all.
  useEffect(() => {
    if (isAdmin) return;
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

  const questionData = getCurrentQuestion(gameState.gameData.feud, gameState);

  const questionState = gameState.currentGame
    .questionState as FamilyFeudQuestionState;

  const revealedAnswers =
    questionState.revealedAnswers.length === 0 && questionData
      ? Array(questionData.answers.length).fill(false)
      : questionState.revealedAnswers;

  const wrongGuesses = questionState.wrongGuesses || 0;
  const revealedCount = revealedAnswers.filter(Boolean).length;

  // Ding on each newly-revealed answer.
  const prevRevealedCount = useRef(revealedCount);
  useEffect(() => {
    if (isAdmin) return;
    if (revealedCount > prevRevealedCount.current) {
      createAudio(dingAudio).play();
    }
    prevRevealedCount.current = revealedCount;
  }, [isAdmin, revealedCount]);

  // Buzzer + a full-screen red X on each new wrong guess (display side only).
  const [showStrike, setShowStrike] = useState(false);
  const prevWrongGuesses = useRef(wrongGuesses);
  useEffect(() => {
    if (isAdmin) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (wrongGuesses > prevWrongGuesses.current) {
      createAudio(buzzerAudio).play();
      setShowStrike(true);
      timer = setTimeout(() => setShowStrike(false), 1300);
    }
    prevWrongGuesses.current = wrongGuesses;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAdmin, wrongGuesses]);

  if (!questionData) {
    return <NoQuestionAvailable />;
  }

  const twoColumns = questionData.answers.length > 4;

  const handleReveal = (index: number) => {
    if (!isAdmin) return;

    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as FamilyFeudQuestionState;

    if (revealedAnswers[index]) return;

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

  const wrongAnswer = () => {
    if (!isAdmin) return;

    const updatedGameState = { ...gameState };
    const updatedQuestionState = updatedGameState.currentGame
      .questionState as FamilyFeudQuestionState;

    updatedQuestionState.wrongGuesses++;
    updatedGameState.currentGame.questionState = updatedQuestionState;
    sendGameStateToServer(updatedGameState); // Send updated state to server
  };

  return (
    <div className="p-4">
      {/* Container for the prompt */}
      {/* Portaled to <body>: the TV scales game content (FitToScreen), and a
          transformed ancestor would trap this fixed overlay inside it. */}
      {showStrike &&
        createPortal(
          <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-strike">
            <FontAwesomeIcon
              icon={faTimesCircle}
              className="text-red-600 drop-shadow-2xl"
              style={{ fontSize: "min(70vh, 70vw)" }}
            />
          </div>,
          document.body
        )}
      <div className="bg-ink border-2 border-accent/50 shadow-md rounded-lg p-3 sm:p-6 mx-auto max-w-4xl xl:max-w-6xl">
        {/* The prompt always takes its space (faint for the host, invisible
            on the TV until shown), so showing it doesn't move anything. */}
        <p
          className={`text-lg sm:text-2xl md:text-3xl xl:text-5xl font-display font-semibold mb-4 text-center ${
            questionState.showFeudPrompt
              ? "text-white"
              : isAdmin
              ? "text-white/40"
              : "invisible"
          }`}
        >
          {questionData.prompt}
        </p>
      </div>

      {/* Container for the answer board. More than four answers go in two
          columns filled top to bottom (1-4 left, 5-8 right), like the show,
          so a big board fits on the TV without scrolling. */}
      <div
        className={`bg-ink border-2 border-accent/50 shadow-md rounded-lg p-3 sm:p-6 mx-auto mt-6 ${
          twoColumns ? "max-w-5xl xl:max-w-7xl" : "max-w-lg xl:max-w-4xl"
        }`}
      >
        <ul
          className={`grid gap-2 sm:gap-4 ${twoColumns ? "grid-cols-2 grid-flow-col" : "grid-cols-1"}`}
          style={
            twoColumns
              ? { gridTemplateRows: `repeat(${Math.ceil(questionData.answers.length / 2)}, auto)` }
              : undefined
          }
        >
          {questionData.answers.map((answer, index) => (
            <li
              key={index}
              className={`p-2 sm:p-4 xl:p-6 border-2 border-black/50 rounded-lg font-display font-semibold text-base sm:text-xl md:text-2xl xl:text-5xl text-white flex items-center justify-between ${
                revealedAnswers[index]
                  ? "bg-gradient-to-b from-sky-400 to-tile animate-flip-in"
                  : "bg-tile"
              } ${isAdmin ? "cursor-pointer hover:brightness-125" : ""}`}
              onClick={() => (isAdmin ? handleReveal(index) : null)}
            >
              {revealedAnswers[index] || isAdmin ? (
                <span>{answer.answer}</span>
              ) : (
                <span className="mx-auto rounded-full bg-accent px-4 text-ink">
                  {index + 1}
                </span>
              )}
              {/* Show points if answer is revealed */}
              {revealedAnswers[index] && (
                <span className="ml-4 rounded bg-ink px-3 text-accent text-base sm:text-xl md:text-2xl xl:text-5xl">
                  {answer.points}
                </span>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-4">
          {isAdmin && (
            <span className="flex flex-wrap gap-2 sm:gap-4">
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

        {/* Display red X's for wrong guesses. With none yet, an invisible one
            holds the row's height so the first X doesn't move the board. */}
        <div className="mt-4 flex flex-wrap">
          {Array.from({ length: Math.max(wrongGuesses, 1) }, (_, index) => (
            <div
              key={index}
              aria-hidden={wrongGuesses === 0}
              className={`text-red-500 flex items-center space-x-2 mb-2 text-3xl sm:text-5xl xl:text-7xl ${
                wrongGuesses === 0 ? "invisible" : ""
              }`}
            >
              <FontAwesomeIcon icon={faTimesCircle} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FamilyFeud;
