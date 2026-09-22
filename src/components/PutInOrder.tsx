import React from "react";
import { bestTeams, scrambledOrder, updateQuestionState } from "../shared/partyGames";
import { teamColor } from "../shared/teamColors";
import {
  getCurrentQuestion,
  OrderQuestionState,
  QuestionProps,
} from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

const LABELS = "ABCDEFGHIJ".split("");

// The TV shows a scrambled list (labelled A, B, C…); every team writes down
// the order they think is right at the same time. The host then reveals the
// true order one position at a time for suspense, enters how many positions
// each team got right, and the best team is highlighted. The host awards the
// tile to that team with the normal buttons.
const PutInOrder: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const puzzle = getCurrentQuestion(gameState.gameData.order ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as OrderQuestionState;

  if (!puzzle) {
    return <NoQuestionAvailable />;
  }

  const teams = gameState.teams;
  const total = puzzle.items.length;
  const revealedCount = questionState.revealedCount ?? 0;
  const allRevealed = revealedCount >= total;
  const counts = questionState.correctCounts ?? {};
  const winners = bestTeams(counts);
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
  const setCount = (teamId: string, value: string) => {
    if (!isAdmin) return;
    patch({
      correctCounts: { ...counts, [teamId]: value === "" ? null : Number(value) },
    });
  };
  const resetRound = () => {
    if (!isAdmin) return;
    patch({
      seed: Math.floor(Math.random() * 2147483647),
      revealedCount: 0,
      correctCounts: Object.fromEntries(teams.map((team) => [team.id, null])),
      showResults: false,
    });
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
                    // The host can see the answer, faintly, before it's revealed.
                    <span className="text-white/30">{item}</span>
                  ) : (
                    <span className="text-white/30">?</span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {questionState.showResults && (
        <ul className="mx-auto mt-5 max-w-2xl space-y-2 text-center">
          {teams.map((team, index) => {
            const count = counts[team.id];
            const isWinner = winners.includes(team.id);
            return (
              <li
                key={team.id}
                className={`flex justify-between rounded-lg border-2 p-3 text-lg sm:text-2xl xl:p-5 xl:text-5xl ${
                  isWinner ? "border-amber-300 bg-amber-400/20" : "border-white/10 bg-surface"
                }`}
              >
                <span className={`font-display font-semibold ${teamColor(index).text}`}>
                  {isWinner && <span aria-hidden="true">🏆 </span>}
                  {team.name}
                </span>
                <span>
                  {count === null || count === undefined ? "—" : `${count} / ${total} correct`}
                </span>
              </li>
            );
          })}
        </ul>
      )}

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

          {allRevealed && (
            <div className="rounded-lg bg-surface p-3">
              <p className="mb-2 text-sm text-white/70">
                How many positions did each team get right?
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {teams.map((team) => (
                  <label key={team.id} className="flex items-center gap-2">
                    <span>{team.name}</span>
                    <select
                      aria-label={`${team.name} correct`}
                      value={counts[team.id] ?? ""}
                      onChange={(e) => setCount(team.id, e.target.value)}
                      className="rounded border p-1 text-gray-900"
                    >
                      <option value="">–</option>
                      {Array.from({ length: total + 1 }, (_, n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={() => patch({ showResults: !questionState.showResults })}
                className="mt-3 rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
              >
                {questionState.showResults ? "Hide results" : "Show results on TV"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PutInOrder;
