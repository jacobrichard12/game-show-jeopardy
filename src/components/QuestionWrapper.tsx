import React, { useEffect, useRef } from "react";
import { revealHitAudio } from "../shared/audio";
import { playSound } from "../shared/sound";
import { GameName, GameState, getGameTitle } from "../shared/types";

interface QuestionWrapperProps {
  gameState: GameState;
  question: React.ReactNode;
}

// Games that play a sound when the host reveals the question (Next). This
// wrapper is TV-only (the TV's PageWrapper and the sandbox's TV panel).
const REVEAL_SOUNDS: Partial<Record<GameName, string>> = {
  [GameName.MINUTE]: revealHitAudio,
};

const QuestionWrapper: React.FC<QuestionWrapperProps> = ({
  gameState,
  question,
}) => {
  const { gameName, gameTitle, column } = gameState.currentGame;
  const questionVisible = gameState.currentGame.questionState.promptVisible;
  const revealSound = REVEAL_SOUNDS[gameName];
  // A tile playing outside its default category (a custom pack's mixed tile,
  // e.g. Scavenger Sprint in Head to Head) keeps its category's name until
  // the reveal, then the heading switches to the game it really is.
  const mixed = !!column && column !== gameName;
  const heading = mixed && questionVisible ? getGameTitle(gameName) : gameTitle;

  // The question itself only mounts once revealed, so the reveal is caught
  // here. The ref starts at the current value: a TV joining after the reveal
  // stays quiet.
  const wasVisible = useRef(questionVisible);
  useEffect(() => {
    if (revealSound && questionVisible && !wasVisible.current) playSound(revealSound);
    wasVisible.current = questionVisible;
  }, [questionVisible, revealSound]);

  return (
    <div className="p-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl md:text-4xl lg:text-[clamp(1.5rem,4vh,3.5rem)] font-display font-semibold mb-2 text-accent">{heading}</h1>
        <p className="text-lg md:text-2xl lg:text-[clamp(1rem,2.5vh,2rem)] text-blue-100">{gameState.currentGame.value} Points</p>
      </div>
      <div className="bg-ink/70 text-white border-2 border-accent/50 p-4 rounded-xl shadow-lg">
        {questionVisible ? (
          <div className="question-content">{question}</div>
        ) : (
          <div className="flex justify-center items-center h-48 text-blue-200 italic">
            The challenge will be revealed soon...
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionWrapper;
