import React, { useEffect, useRef } from "react";
import { dingAudio } from "../shared/audio";
import { bestTeams, charadesWord } from "../shared/partyGames";
import { playSound } from "../shared/sound";
import { teamColor } from "../shared/teamColors";
import { GameState, SIDE_CHARADES_KEY, SideCharadesState } from "../shared/types";

interface SideCharadesProps {
  isAdmin: boolean;
  gameState: GameState;
  sendGameStateToServer: (gameState: GameState) => void;
}

const freshState = (): SideCharadesState => ({
  activeTeamId: null,
  lastTeamId: null,
  wordIndex: 0,
  totals: {},
  turnScore: 0,
  turns: 0,
});

// Reverse Charades as an open-ended side game (a pack's side-game page, no
// tiles): one long shuffled word list, teams taking turns back and forth for
// as many rounds as the host wants, with running totals. Same play as the
// tile version (ReverseCharades): the team acts out the word on the TV for
// one guesser facing away; the host taps Got it / Skip, then End turn. Turns
// are timed with the host's Toggle Timer. Separate from the main scores.
const SideCharades: React.FC<SideCharadesProps> = ({ isAdmin, gameState, sendGameStateToServer }) => {
  const list = gameState.gameData.charades?.[SIDE_CHARADES_KEY];
  const words = list?.words ?? [];
  const state = gameState.sideCharades ?? freshState();
  const teams = gameState.teams;
  const totalGot = Object.values(state.totals).reduce((sum, n) => sum + n, 0);

  // Ding on the TV for every word a team gets.
  const prevTotal = useRef(totalGot);
  useEffect(() => {
    const before = prevTotal.current;
    prevTotal.current = totalGot;
    if (!isAdmin && totalGot > before) playSound(dingAudio);
  }, [isAdmin, totalGot]);

  const activeIndex = teams.findIndex((team) => team.id === state.activeTeamId);
  const activeTeam = activeIndex >= 0 ? teams[activeIndex] : undefined;
  const turnLive = !!activeTeam;
  const round = Math.max(1, Math.ceil(state.turns / Math.max(1, teams.length)));
  // Next up: the team after the last one to play (the first team to start).
  const lastIndex = teams.findIndex((team) => team.id === state.lastTeamId);
  const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % teams.length : 0;
  const leaders = bestTeams(state.totals);
  const word = charadesWord(words, state.wordIndex);

  const update = (changes: Partial<SideCharadesState>) => {
    if (isAdmin) sendGameStateToServer({ ...gameState, sideCharades: { ...state, ...changes } });
  };
  // Switching teams mid-turn moves on a word: the old one has been seen.
  const startTurn = (teamId: string) =>
    update({
      activeTeamId: teamId,
      lastTeamId: teamId,
      turnScore: 0,
      turns: state.turns + 1,
      wordIndex: state.wordIndex + (turnLive ? 1 : 0),
    });
  // Hides the word on the TV and moves on one, so the next team gets a word
  // nobody has seen.
  const endTurn = () => {
    if (state.activeTeamId) update({ activeTeamId: null, wordIndex: state.wordIndex + 1 });
  };
  const gotIt = () => {
    if (!state.activeTeamId) return;
    const id = state.activeTeamId;
    update({
      wordIndex: state.wordIndex + 1,
      turnScore: state.turnScore + 1,
      totals: { ...state.totals, [id]: (state.totals[id] ?? 0) + 1 },
    });
  };
  const skip = () => {
    if (state.activeTeamId) update({ wordIndex: state.wordIndex + 1 });
  };
  // Keeps the place in the word list, so a new game doesn't repeat words.
  const resetTotals = () => update({ ...freshState(), wordIndex: state.wordIndex });

  return (
    <div className="rounded-xl bg-ink p-3 text-center text-white sm:p-6">
      <p className="font-display text-3xl font-semibold text-accent sm:text-5xl xl:text-8xl">
        {list?.category ?? "Reverse Charades"}
      </p>
      {/* The round, once the first turn has started. */}
      {state.turns > 0 && (
        <p className="mt-2 text-base text-blue-100 sm:text-xl xl:text-4xl">Round {round}</p>
      )}

      {activeTeam && (
        <p className="mt-4 text-lg sm:text-2xl xl:text-5xl">
          Up now:{" "}
          <span className={`font-display font-semibold ${teamColor(activeIndex).text}`}>{activeTeam.name}</span>
          <span className="text-white/70"> · {state.turnScore} this turn</span>
        </p>
      )}

      {(turnLive || isAdmin) && words.length > 0 && (
        <div className="mx-auto my-5 max-w-3xl rounded-lg border-2 border-accent/50 p-4">
          {isAdmin && (
            <p className="text-sm uppercase tracking-widest text-white/60">
              {turnLive ? "On the TV now" : "Next word (host only)"}
            </p>
          )}
          <p
            aria-label="Current word"
            className="flex min-h-[2.5em] items-center justify-center font-display text-4xl font-semibold sm:text-6xl xl:text-9xl"
          >
            {word}
          </p>
        </div>
      )}
      {words.length === 0 && <p className="my-6 text-xl text-white/60">No words for this side game.</p>}
      {!activeTeam && !isAdmin && (
        <p className="my-6 font-display text-3xl font-semibold text-white/60 sm:text-6xl xl:text-8xl">Get ready…</p>
      )}

      {isAdmin && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={gotIt}
              disabled={!turnLive}
              className="rounded bg-emerald-600 px-6 py-3 text-lg text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              ✓ Got it
            </button>
            <button
              type="button"
              onClick={skip}
              disabled={!turnLive}
              className="rounded bg-gray-200 px-6 py-3 text-lg text-gray-800 hover:bg-gray-300 disabled:opacity-50"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={endTurn}
              disabled={!turnLive}
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
                className={`rounded px-3 py-2 text-sm text-white ${teamColor(index).chip} ${
                  !turnLive && index === nextIndex ? "ring-2 ring-white ring-offset-2 ring-offset-ink" : ""
                }`}
              >
                Start {team.name}'s turn
              </button>
            ))}
          </div>
          <p className="text-sm text-white/60">
            {words.length} words, shuffled; word {Math.min(state.wordIndex + 1, words.length)} next. Totals are separate
            from the main game's scores.{" "}
            <button type="button" onClick={resetTotals} className="underline hover:text-white">
              Reset totals
            </button>
          </p>
        </div>
      )}

      <ul className="mx-auto mt-5 max-w-2xl space-y-2">
        {teams.map((team, index) => {
          const total = state.totals[team.id] ?? 0;
          const leading = leaders.includes(team.id);
          return (
            <li
              key={team.id}
              className={`flex justify-between rounded-lg border-2 p-3 text-lg sm:text-2xl xl:p-5 xl:text-5xl ${
                leading
                  ? "border-amber-300 bg-amber-400/20"
                  : team.id === state.activeTeamId
                  ? "border-accent/60 bg-surface"
                  : "border-white/10 bg-surface"
              }`}
            >
              <span className={`font-display font-semibold ${teamColor(index).text}`}>
                {leading && <span aria-hidden="true">👑 </span>}
                {team.name}
              </span>
              <span>
                {total} word{total === 1 ? "" : "s"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default SideCharades;
