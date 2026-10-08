import React, { useEffect, useRef } from "react";
import { dingAudio } from "../shared/audio";
import { useCountdown } from "../shared/countdown";
import { bestTeams, charadesWord, startClock, updateQuestionState } from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { teamColor } from "../shared/teamColors";
import {
  CharadesQuestionState,
  ClockState,
  getCurrentQuestion,
  QuestionProps,
} from "../shared/types";
import CountdownClock from "./CountdownClock";
import NoQuestionAvailable from "./NoQuestionAvailable";

// Reverse charades: one guesser per team stands with their back to the TV
// while the rest of the team acts out the word on screen. Each team gets one
// timed turn to get through as many words as they can; the host taps
// "Got it" or "Skip". Words carry on from where the last team stopped, so no
// team sees a word twice. Most words wins; the host awards the tile with the
// normal points buttons.
const ReverseCharades: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const prompt = getCurrentQuestion(gameState.gameData.charades ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as CharadesQuestionState;
  const scores = questionState.scores ?? {};
  const remaining = useCountdown(questionState.clock);
  const totalGot = Object.values(scores).reduce<number>((sum, n) => sum + (n ?? 0), 0);

  // Ding on the TV for every word a team gets.
  const prevTotal = useRef(totalGot);
  useEffect(() => {
    const before = prevTotal.current;
    prevTotal.current = totalGot;
    if (!isAdmin && totalGot > before) playSound(dingAudio);
  }, [isAdmin, totalGot]);

  if (!prompt) {
    return <NoQuestionAvailable />;
  }

  const teams = gameState.teams;
  const clock = questionState.clock;
  const activeId = questionState.activeTeamId;
  const activeIndex = teams.findIndex((team) => team.id === activeId);
  const activeTeam = activeIndex >= 0 ? teams[activeIndex] : undefined;
  const word = charadesWord(prompt.words, questionState.wordIndex);
  const longestWord = prompt.words.reduce((a, b) => (b.length > a.length ? b : a), "");
  const turnLive = !!activeTeam && remaining > 0;
  const allPlayed = teams.every((team) => typeof scores[team.id] === "number");
  const showWinner = allPlayed && (remaining === 0 || !clock.running);
  const winners = showWinner ? bestTeams(scores) : [];

  const patch = (changes: Partial<CharadesQuestionState>) =>
    sendGameStateToServer(updateQuestionState<CharadesQuestionState>(gameState, changes));

  const setClock = (next: ClockState) => {
    if (isAdmin) patch({ clock: next });
  };
  // Starting (or redoing) a turn gives that team a fresh score and a full clock.
  const startTurn = (teamId: string) => {
    if (!isAdmin) return;
    sendGameStateToServer({
      ...updateQuestionState<CharadesQuestionState>(gameState, {
        activeTeamId: teamId,
        scores: { ...scores, [teamId]: 0 },
        clock: startClock({ ...clock, remainingMs: clock.durationMs }),
      }),
      whoseTurn: teamId,
    });
  };
  const gotIt = () => {
    if (!isAdmin || !activeId) return;
    patch({
      wordIndex: questionState.wordIndex + 1,
      scores: { ...scores, [activeId]: (scores[activeId] ?? 0) + 1 },
    });
  };
  const skip = () => {
    if (isAdmin && activeId) patch({ wordIndex: questionState.wordIndex + 1 });
  };

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <p className="font-display text-3xl font-semibold text-accent sm:text-5xl xl:text-8xl">
        <span aria-hidden="true">🙆</span> REVERSE CHARADES
      </p>
      <p className="mt-2 text-base text-blue-100 sm:text-xl xl:text-4xl">{prompt.category}</p>

      {activeTeam && (
        <p className="mt-4 text-lg sm:text-2xl xl:text-5xl">
          Up now:{" "}
          <span className={`font-display font-semibold ${teamColor(activeIndex).text}`}>
            {activeTeam.name}
          </span>
        </p>
      )}

      {/* The word: TV only while a turn is on the clock; the host always, with
          the same layout either way so the host's buttons don't move. */}
      {(turnLive || isAdmin) && (
        <div className="mx-auto my-5 max-w-3xl rounded-lg border-2 border-accent/50 p-4">
          {isAdmin && (
            <p className="text-sm uppercase tracking-widest text-white/60">
              {turnLive ? "On the TV now" : "Next word (host only)"}
            </p>
          )}
          {/* Sized by an invisible copy of the tile's longest word, so a
              longer word wrapping onto more lines never moves the buttons
              and clock below (same trick as Put It In Order's slots). */}
          <div className="grid font-display text-4xl font-semibold sm:text-6xl xl:text-9xl">
            <span className="invisible col-start-1 row-start-1" aria-hidden="true">
              {longestWord}
            </span>
            <p
              aria-label="Current word"
              className="col-start-1 row-start-1 flex items-center justify-center"
            >
              {word}
            </p>
          </div>
        </div>
      )}
      {!activeTeam && !isAdmin && (
        <p className="my-6 font-display text-3xl font-semibold text-white/60 sm:text-6xl xl:text-8xl">
          Get ready…
        </p>
      )}

      <div className="my-4">
        <CountdownClock clock={clock} isAdmin={isAdmin} onChange={setClock} />
      </div>

      {isAdmin && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={gotIt}
              disabled={!activeId}
              className="rounded bg-emerald-600 px-6 py-3 text-lg text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              ✓ Got it
            </button>
            <button
              type="button"
              onClick={skip}
              disabled={!activeId}
              className="rounded bg-gray-200 px-6 py-3 text-lg text-gray-800 hover:bg-gray-300 disabled:opacity-50"
            >
              Skip
            </button>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {teams.map((team, index) => (
              <button
                key={team.id}
                type="button"
                onClick={() => startTurn(team.id)}
                className={`rounded px-3 py-2 text-sm text-white ${teamColor(index).chip}`}
              >
                {typeof scores[team.id] === "number" ? "Redo" : "Start"} {team.name}'s turn
              </button>
            ))}
          </div>
        </div>
      )}

      <ul className="mx-auto mt-5 max-w-2xl space-y-2">
        {teams.map((team, index) => {
          const count = scores[team.id];
          const isWinner = winners.includes(team.id);
          return (
            <li
              key={team.id}
              className={`flex justify-between rounded-lg border-2 p-3 text-lg sm:text-2xl xl:p-5 xl:text-5xl ${
                isWinner
                  ? "border-amber-300 bg-amber-400/20"
                  : team.id === activeId
                  ? "border-accent/60 bg-surface"
                  : "border-white/10 bg-surface"
              }`}
            >
              <span className={`font-display font-semibold ${teamColor(index).text}`}>
                {isWinner && <span aria-hidden="true">🏆 </span>}
                {team.name}
              </span>
              <span>
                {typeof count === "number" ? `${count} word${count === 1 ? "" : "s"}` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ReverseCharades;
