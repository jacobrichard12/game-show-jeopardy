import React, { useEffect, useRef } from "react";
import { dingAudio } from "../shared/audio";
import { bestTeams, charadesWord, updateQuestionState } from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { teamColor } from "../shared/teamColors";
import {
  CharadesQuestionState,
  GameState,
  getCurrentQuestion,
  QuestionProps,
  SIDE_CHARADES_KEY,
} from "../shared/types";
import NoQuestionAvailable from "./NoQuestionAvailable";

// Reverse charades: one guesser per team stands with their back to the TV
// while the rest of the team acts out the word on screen. Each team gets one
// turn to get through as many words as they can (timed with the host's Toggle
// Timer, not a clock of its own); the host taps "Got it" or "Skip", then
// "End turn". Words carry on from where the last team stopped, so no
// team sees a word twice. A pack tile with no words of its own ("shared")
// plays from the pack's Reverse Charades tab list and moves the same place in
// it, so the tile and the tab never repeat each other's words. Most words wins; the host awards the tile with the
// normal points buttons.
const ReverseCharades: React.FC<QuestionProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const prompt = getCurrentQuestion(gameState.gameData.charades ?? {}, gameState);
  const questionState = gameState.currentGame.questionState as CharadesQuestionState;
  const scores = questionState.scores ?? {};
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

  // A shared tile reads the tab's list and place; otherwise its own.
  const sideList = gameState.gameData.charades?.[SIDE_CHARADES_KEY];
  const shared = !!prompt.shared && !!sideList;
  const words = shared ? sideList!.words : prompt.words;
  const wordIndex = shared ? gameState.sideCharades?.wordIndex ?? 0 : questionState.wordIndex;

  const teams = gameState.teams;
  const activeId = questionState.activeTeamId;
  const activeIndex = teams.findIndex((team) => team.id === activeId);
  const activeTeam = activeIndex >= 0 ? teams[activeIndex] : undefined;
  const word = charadesWord(words, wordIndex);
  const longestWord = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  const turnLive = !!activeTeam;
  const allPlayed = teams.every((team) => typeof scores[team.id] === "number");
  const showWinner = allPlayed && !turnLive;
  const winners = showWinner ? bestTeams(scores) : [];

  // Applies the changes and moves on one word: in the tab's shared list, or
  // the tile's own.
  const withNextWord = (changes: Partial<CharadesQuestionState> = {}): GameState => {
    if (!shared) {
      return updateQuestionState<CharadesQuestionState>(gameState, {
        ...changes,
        wordIndex: questionState.wordIndex + 1,
      });
    }
    const next: GameState = updateQuestionState<CharadesQuestionState>(gameState, changes);
    return {
      ...next,
      sideCharades: {
        activeTeamId: null,
        lastTeamId: null,
        totals: {},
        turnScore: 0,
        turns: 0,
        ...gameState.sideCharades,
        wordIndex: wordIndex + 1,
      },
    };
  };
  const nextWord = (changes: Partial<CharadesQuestionState> = {}) => sendGameStateToServer(withNextWord(changes));

  // Starting (or redoing) a turn gives that team a fresh score. Switching
  // teams mid-turn also moves on a word: the old one has been seen.
  const startTurn = (teamId: string) => {
    if (!isAdmin) return;
    const changes = { activeTeamId: teamId, scores: { ...scores, [teamId]: 0 } };
    const next = turnLive ? withNextWord(changes) : updateQuestionState<CharadesQuestionState>(gameState, changes);
    sendGameStateToServer({ ...next, whoseTurn: teamId });
  };
  // Hides the word on the TV and moves on one, so the next team gets a word
  // nobody has seen.
  const endTurn = () => {
    if (isAdmin && activeId) nextWord({ activeTeamId: null });
  };
  const gotIt = () => {
    if (!isAdmin || !activeId) return;
    nextWord({ scores: { ...scores, [activeId]: (scores[activeId] ?? 0) + 1 } });
  };
  const skip = () => {
    if (isAdmin && activeId) nextWord();
  };

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <p className="font-display text-3xl font-semibold text-accent sm:text-5xl xl:text-8xl">
        REVERSE CHARADES
      </p>

      {activeTeam && (
        <p className="mt-4 text-lg sm:text-2xl xl:text-5xl">
          Up now:{" "}
          <span className={`font-display font-semibold ${teamColor(activeIndex).text}`}>
            {activeTeam.name}
          </span>
        </p>
      )}

      {/* The word: TV only during a turn; the host always, with
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
              below (same trick as Put It In Order's slots). */}
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
            <button
              type="button"
              onClick={endTurn}
              disabled={!activeId}
              className="rounded bg-orange-500 px-6 py-3 text-lg text-white hover:bg-orange-600 disabled:opacity-50"
            >
              End turn
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
