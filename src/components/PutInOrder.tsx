import React, { useEffect, useRef } from "react";
import { dingAudio } from "../shared/audio";
import { scrambledOrder, updateQuestionState } from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { teamColor } from "../shared/teamColors";
import {
  getCurrentQuestion,
  OrderQuestionState,
  QuestionProps,
} from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

const LABELS = "ABCDEFGHIJ".split("");

// The TV shows a scrambled list (labelled A, B, C…) and one team — whoever has
// the turn — works out the right order. The host then reveals the true order
// one position at a time for suspense (a ding each time) and either awards the
// tile to that team or marks it "No points".
const PutInOrder: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const puzzle = getCurrentQuestion(gameState.gameData.order ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as OrderQuestionState;
  const revealedCount = questionState.revealedCount ?? 0;

  // Ding on the TV each time more of the order is revealed.
  const prevRevealed = useRef(revealedCount);
  useEffect(() => {
    const before = prevRevealed.current;
    prevRevealed.current = revealedCount;
    if (!isAdmin && revealedCount > before) playSound(dingAudio);
  }, [isAdmin, revealedCount]);

  if (!puzzle) {
    return <NoQuestionAvailable />;
  }

  const teams = gameState.teams;
  const total = puzzle.items.length;
  const allRevealed = revealedCount >= total;
  const turnIndex = Math.max(0, teams.findIndex((team) => team.id === gameState.whoseTurn));
  const turnTeam = teams[turnIndex];
  const scrambled = scrambledOrder(puzzle.items, questionState.seed);
  const labelFor = (item: string) => LABELS[scrambled.indexOf(item)];

  const patch = (changes: Partial<OrderQuestionState>) =>
    sendGameStateToServer(updateQuestionState<OrderQuestionState>(gameState, changes));

  const revealNext = () => {
    if (isAdmin && !allRevealed) patch({ revealedCount: revealedCount + 1 });
  };
  const revealAll = () => {
    if (isAdmin) patch({ revealedCount: total });
  };
  const resetRound = () => {
    if (!isAdmin) return;
    patch({ seed: Math.floor(Math.random() * 2147483647), revealedCount: 0 });
  };

  return (
    <div className="rounded-xl bg-ink p-3 text-white sm:p-6">
      <div className="text-center">
        <p className="font-display text-2xl font-semibold sm:text-4xl xl:text-7xl">
          Put these in order
        </p>
        <p className="mt-2 text-base text-blue-100 sm:text-xl xl:text-4xl">
          {puzzle.prompt}: <span className="text-accent">{puzzle.direction}</span>
        </p>
        {turnTeam && (
          <p className="mt-3 text-lg sm:text-2xl xl:text-5xl">
            Playing:{" "}
            <span className={`font-display font-semibold ${teamColor(turnIndex).text}`}>
              {turnTeam.name}
            </span>
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg bg-surface p-3 xl:p-6">
          <p className="mb-2 text-sm uppercase tracking-widest text-white/60 xl:text-2xl">
            Scrambled
          </p>
          <ul className="space-y-2">
            {scrambled.map((item, index) => (
              <li
                key={item}
                className="rounded bg-tile p-2 font-display text-lg font-semibold sm:text-2xl xl:p-4 xl:text-5xl"
              >
                <span className="mr-3 text-accent">{LABELS[index]}</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-surface p-3 xl:p-6">
          <p className="mb-2 text-sm uppercase tracking-widest text-white/60 xl:text-2xl">
            Correct order
          </p>
          <ol className="space-y-2">
            {puzzle.items.map((item, index) => {
              const shown = index < revealedCount;
              return (
                <li
                  key={item}
                  className={`rounded p-2 font-display text-lg font-semibold sm:text-2xl xl:p-4 xl:text-5xl ${
                    shown ? "bg-emerald-700" : "bg-tile"
                  }`}
                >
                  <span className="mr-3 text-accent">{index + 1}.</span>
                  {shown ? (
                    <>
                      {item} <span className="text-white/60">({labelFor(item)})</span>
                    </>
                  ) : isAdmin ? (
                    // The host sees the answer faintly before it's revealed, in
                    // the same text as after so the panel doesn't reflow.
                    <span className="text-white/30">
                      {item} ({labelFor(item)})
                    </span>
                  ) : (
                    // "?" over the invisible answer, so revealing it doesn't
                    // resize the row on the TV.
                    <span className="inline-grid">
                      <span className="invisible col-start-1 row-start-1" aria-hidden="true">
                        {item} ({labelFor(item)})
                      </span>
                      <span className="col-start-1 row-start-1 text-white/30">?</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {isAdmin && (
        <div className="mt-5 space-y-4 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={revealNext}
              disabled={allRevealed}
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              Reveal next
            </button>
            <button
              type="button"
              onClick={revealAll}
              disabled={allRevealed}
              className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              Reveal all
            </button>
            <button
              type="button"
              onClick={resetRound}
              className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            >
              Reset round
            </button>
          </div>
          <p className="text-sm text-white/60">
            Award the tile to the team if they got it right, or use No points.
          </p>
        </div>
      )}
    </div>
  );
};

export default PutInOrder;
