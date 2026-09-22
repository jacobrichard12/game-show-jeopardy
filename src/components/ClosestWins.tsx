import React, { useState } from "react";
import { computeClosestResult, updateQuestionState } from "../shared/partyGames";
import { teamColor } from "../shared/teamColors";
import {
  ClosestQuestion,
  ClosestQuestionState,
  getCurrentQuestion,
  QuestionProps,
} from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

const parseGuess = (text: string): number | null => {
  const cleaned = text.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
};

const formatNumber = (value: number, question: ClosestQuestion) =>
  `${question.plain ? String(value) : value.toLocaleString()}${
    question.unit ? ` ${question.unit}` : ""
  }`;

// Every team huddles and writes down a number at the same time (nobody waits
// for a turn). The host types in each team's guess and locks it; guesses stay
// hidden on the TV until the host reveals, then the closest team is
// highlighted. The host awards the tile to the winner with the normal buttons.
const ClosestWins: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const question = getCurrentQuestion(gameState.gameData.closest ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as ClosestQuestionState;
  // Host-side text boxes, before a guess is locked in.
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  if (!question) {
    return <NoQuestionAvailable />;
  }

  const teams = gameState.teams;
  const guesses = questionState.guesses ?? {};
  const revealed = !!questionState.revealed;
  const rule = question.rule ?? "closest";
  const result = computeClosestResult(question.answer, guesses, rule);
  const anyLocked = teams.some((team) => guesses[team.id] !== null && guesses[team.id] !== undefined);

  const setGuess = (teamId: string, value: number | null) =>
    sendGameStateToServer(
      updateQuestionState<ClosestQuestionState>(gameState, {
        guesses: { ...guesses, [teamId]: value },
      })
    );

  const lock = (teamId: string) => {
    if (!isAdmin) return;
    const value = parseGuess(drafts[teamId] ?? "");
    if (value !== null) setGuess(teamId, value);
  };
  const unlock = (teamId: string) => {
    if (!isAdmin) return;
    setDrafts((current) => ({ ...current, [teamId]: String(guesses[teamId] ?? "") }));
    setGuess(teamId, null);
  };
  const reveal = () => {
    if (!isAdmin || !anyLocked) return;
    sendGameStateToServer(updateQuestionState<ClosestQuestionState>(gameState, { revealed: true }));
  };
  const resetRound = () => {
    if (!isAdmin) return;
    setDrafts({});
    sendGameStateToServer(
      updateQuestionState<ClosestQuestionState>(gameState, {
        guesses: Object.fromEntries(teams.map((team) => [team.id, null])),
        revealed: false,
      })
    );
  };

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <p className="font-display text-2xl font-semibold sm:text-4xl xl:text-7xl">
        {question.prompt}
      </p>
      <p className="mt-2 text-base text-blue-100 sm:text-xl xl:text-4xl">
        {rule === "noOver"
          ? "Closest without going over wins."
          : "Closest guess wins. Write your number down!"}
      </p>

      {revealed && (
        <p className="my-6 font-display text-4xl font-semibold text-accent sm:text-7xl xl:text-9xl">
          {formatNumber(question.answer, question)}
        </p>
      )}

      <ul className="mx-auto mt-5 max-w-3xl space-y-2 sm:space-y-3">
        {teams.map((team, index) => {
          const guess = guesses[team.id] ?? null;
          const isWinner = revealed && result.winners.includes(team.id);
          const wentOver = revealed && guess !== null && !result.eligible[team.id];
          const distance = result.distances[team.id];
          return (
            <li
              key={team.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 p-3 xl:p-6 ${
                isWinner ? "border-amber-300 bg-amber-400/20" : "border-white/10 bg-surface"
              }`}
            >
              <span
                className={`font-display text-lg font-semibold sm:text-2xl xl:text-5xl ${teamColor(index).text}`}
              >
                {isWinner && <span aria-hidden="true">🏆 </span>}
                {team.name}
              </span>

              <span className="text-base sm:text-xl xl:text-4xl">
                {revealed ? (
                  guess === null ? (
                    <span className="text-white/50">no guess</span>
                  ) : (
                    <>
                      {formatNumber(guess, question)}
                      <span className="ml-3 text-sm text-white/60 sm:text-lg xl:text-3xl">
                        {wentOver
                          ? "went over"
                          : distance === 0
                          ? "exact!"
                          : `off by ${distance !== null ? distance.toLocaleString() : "?"}`}
                      </span>
                    </>
                  )
                ) : guess !== null ? (
                  <span className="text-emerald-300">🔒 Locked in</span>
                ) : (
                  <span className="text-white/50">thinking…</span>
                )}
              </span>

              {isAdmin && !revealed && (
                <span className="flex items-center gap-2">
                  {guess === null ? (
                    <>
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`${team.name} guess`}
                        value={drafts[team.id] ?? ""}
                        onChange={(e) =>
                          setDrafts((current) => ({ ...current, [team.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") lock(team.id);
                        }}
                        className="w-32 rounded border p-1 text-gray-900"
                        placeholder="Guess"
                      />
                      <button
                        type="button"
                        onClick={() => lock(team.id)}
                        disabled={parseGuess(drafts[team.id] ?? "") === null}
                        aria-label={`Lock in ${team.name}`}
                        className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600 disabled:opacity-50"
                      >
                        Lock in
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-mono">{guess}</span>
                      <button
                        type="button"
                        onClick={() => unlock(team.id)}
                        aria-label={`Change ${team.name}`}
                        className="rounded bg-gray-200 px-3 py-1 text-gray-800 hover:bg-gray-300"
                      >
                        Change
                      </button>
                    </>
                  )}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {revealed && (
        <p className="mt-4 text-lg font-semibold text-amber-200 sm:text-2xl xl:text-5xl">
          {result.winners.length === 0
            ? "Nobody wins this one."
            : `Winner: ${result.winners
                .map((id) => teams.find((team) => team.id === id)?.name)
                .join(" & ")}`}
        </p>
      )}

      {isAdmin && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {!revealed && (
            <button
              type="button"
              onClick={reveal}
              disabled={!anyLocked}
              className="rounded bg-yellow-500 px-4 py-2 text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              Reveal answer
            </button>
          )}
          <button
            type="button"
            onClick={resetRound}
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            Reset round
          </button>
        </div>
      )}
    </div>
  );
};

export default ClosestWins;
