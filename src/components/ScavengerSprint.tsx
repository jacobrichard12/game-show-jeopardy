import React, { useEffect, useRef } from "react";
import { scavengerRevealAudio } from "../shared/audio";
import { updateQuestionState } from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { getCurrentQuestion, QuestionProps, ScavengerQuestionState } from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

// A race: the TV shows an item to find; the first team to bring it to the
// host wins. The item stays hidden until the host shows it, so nobody gets a
// head start. No clock (owner, 2026-10-01): items are meant to be findable, so
// the race ends when someone brings one. The host then awards the tile with
// the normal points buttons. (The state still carries an unused `clock`.)
const ScavengerSprint: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const item = getCurrentQuestion(gameState.gameData.scavenger ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as ScavengerQuestionState;
  const itemRevealed = !!questionState.itemRevealed;

  // Orchestra hit on the TV when the item is shown (not for a TV that joins
  // after the reveal: the ref starts at the current value).
  const wasRevealed = useRef(itemRevealed);
  useEffect(() => {
    if (!isAdmin && itemRevealed && !wasRevealed.current) playSound(scavengerRevealAudio);
    wasRevealed.current = itemRevealed;
  }, [isAdmin, itemRevealed]);

  if (!item) {
    return <NoQuestionAvailable />;
  }

  const revealItem = () => {
    if (!isAdmin || itemRevealed) return;
    sendGameStateToServer(
      updateQuestionState<ScavengerQuestionState>(gameState, { itemRevealed: true })
    );
  };

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <p className="font-display text-xl font-semibold uppercase tracking-widest text-accent sm:text-3xl xl:text-6xl">
        🏃 Find it and bring it to the host!
      </p>
      {isAdmin ? (
        // Same box before and after the reveal so the host's buttons stay put.
        <div className="mx-auto my-6 max-w-3xl rounded-lg border-2 border-accent/50 p-4">
          <p className="text-sm uppercase tracking-widest text-white/60">
            {itemRevealed ? "On the TV now" : "Item (host only)"}
          </p>
          <p className="font-display text-3xl font-semibold sm:text-5xl">{item.item}</p>
          <button
            type="button"
            onClick={revealItem}
            disabled={itemRevealed}
            className="mt-3 rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:opacity-50"
          >
            Show item
          </button>
        </div>
      ) : itemRevealed ? (
        <p className="my-6 font-display text-3xl font-semibold sm:text-6xl xl:text-9xl">
          {item.item}
        </p>
      ) : (
        <p className="my-6 font-display text-3xl font-semibold text-white/60 sm:text-6xl xl:text-9xl">
          Get ready…
        </p>
      )}
      {isAdmin && (
        <p className="mt-4 text-sm text-white/60">
          First team to bring it over wins. Award the tile to them below.
        </p>
      )}
    </div>
  );
};

export default ScavengerSprint;
