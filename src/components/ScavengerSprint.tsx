import React from "react";
import { updateQuestionState } from "../shared/partyGames";
import {
  ClockState,
  getCurrentQuestion,
  QuestionProps,
  ScavengerQuestionState,
} from "../shared/types";
import CountdownClock from "./CountdownClock";
import NoQuestionAvailable from "./NoQuestionAvailable";

// A race: the TV shows an item to find and a clock; the first team to bring
// it to the host wins. The host starts the clock, then awards the tile to the
// winning team with the normal points buttons.
const ScavengerSprint: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const item = getCurrentQuestion(gameState.gameData.scavenger ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as ScavengerQuestionState;

  if (!item) {
    return <NoQuestionAvailable />;
  }

  const setClock = (clock: ClockState) => {
    if (!isAdmin) return;
    sendGameStateToServer(updateQuestionState<ScavengerQuestionState>(gameState, { clock }));
  };

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <p className="font-display text-xl font-semibold uppercase tracking-widest text-accent sm:text-3xl xl:text-6xl">
        🏃 Find it and bring it to the host!
      </p>
      <p className="my-6 font-display text-3xl font-semibold sm:text-6xl xl:text-9xl">
        {item.item}
      </p>
      <CountdownClock clock={questionState.clock} isAdmin={isAdmin} onChange={setClock} />
      {isAdmin && (
        <p className="mt-4 text-sm text-white/60">
          First team to bring it over wins. Award the tile to them below.
        </p>
      )}
    </div>
  );
};

export default ScavengerSprint;
