import React, { useEffect, useRef, useState } from "react";
import { getRandomAudio, happyFiles } from "../shared/audio";
import { playSound } from "../shared/sound";
import { teamColor } from "../shared/teamColors";
import { GameName, GameState } from "../shared/types";

interface ScoreBoardProps {
  isAdmin: boolean;
  gameState: GameState;
  handleUpdateTurn?: (teamId: string) => void;
}

// How long the score "bounce" animation plays after a score change.
const BOUNCE_DURATION_MS = 2000;

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  isAdmin,
  gameState,
  handleUpdateTurn,
}) => {
  const [bouncingTeamId, setBouncingTeamId] = useState<string | null>(null);
  // A ref (not state) because writing it must not itself re-trigger the
  // effect below — it only exists to remember the previous render's scores.
  const prevScores = useRef<Record<string, number>>(
    Object.fromEntries(gameState.teams.map((team) => [team.id, team.score]))
  );

  // A joined string change only when a score actually does, unlike a fresh
  // array/object each render — used as the effect's dependency below so it
  // only re-runs on a genuine score change, for any number of teams.
  const scoresKey = gameState.teams.map((team) => `${team.id}:${team.score}`).join(",");

  useEffect(() => {
    const prev = prevScores.current;
    const changedTeam = gameState.teams.find((team) => team.score !== prev[team.id]);

    // Nothing changed since the last render — skip.
    if (!changedTeam) return;

    setBouncingTeamId(changedTeam.id);
    const timer = setTimeout(() => setBouncingTeamId(null), BOUNCE_DURATION_MS);

    // Sound plays only on the display copy of this component (rendered with
    // isAdmin=false), not the host's control panel — so on a single machine
    // with both tabs open, the sound comes from the "watch" screen rather
    // than the admin tab, matching where an audience would actually be. Both
    // Admin and Display render a Scoreboard from the same broadcast state,
    // so gating on isAdmin here (rather than only ever playing it from
    // Admin's own click handler) is what makes that possible.
    if (!isAdmin) {
      playSound(getRandomAudio(happyFiles));
    }

    prevScores.current = Object.fromEntries(
      gameState.teams.map((team) => [team.id, team.score])
    );

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoresKey, isAdmin]);

  return (
    // flex-nowrap + flex-1 (rather than flex-wrap + a fixed min-width): all
    // teams always share one row, shrinking evenly to fit instead of
    // wrapping to a second row once there isn't room for every box's
    // minimum width — matters once there are 3-4 teams on a narrow screen.
    <div className="flex flex-nowrap justify-around items-stretch gap-1 sm:gap-4">
      {gameState.teams.map((team, index) => {
        const isTeamsTurn = gameState.whoseTurn === team.id;
        const color = teamColor(index);
        return (
          <div
            key={team.id}
            // Each team keeps its own color; the team whose turn it is gets a
            // glow, a brighter panel and a marker so it reads from a distance.
            className={`flex-1 min-w-0 p-1 sm:p-4 border-2 sm:border-4 rounded-lg lg:py-[1vh] text-center transition-all duration-300 ${
              color.border
            } ${
              isTeamsTurn
                ? `bg-surface ${color.glow} scale-[1.04]`
                : "bg-ink opacity-90"
            }`}
          >
            <div className="h-3 sm:h-6 lg:h-[2.5vh] text-[10px] sm:text-sm lg:text-[clamp(0.75rem,1.6vh,1.5rem)] font-semibold tracking-widest text-accent">
              {isTeamsTurn ? "▶ Turn" : ""}
            </div>
            <h3 className="font-display font-semibold text-sm sm:text-2xl md:text-5xl lg:text-[clamp(1.25rem,3.4vh,3.5rem)] leading-tight mb-1 sm:mb-2 break-words text-white">{team.name}</h3>
            <p
              className={`font-display font-semibold text-lg sm:text-3xl md:text-5xl lg:text-[clamp(1.75rem,6vh,6rem)] leading-tight ${color.text} ${
                bouncingTeamId === team.id ? "animate-bounce" : ""
              }`}
            >
              {team.score}
            </p>
            {isAdmin && handleUpdateTurn && gameState.currentGame.gameName === GameName.BOARD && (
              <button
                onClick={() => handleUpdateTurn(team.id)}
                className="mt-1 sm:mt-2 text-[10px] sm:text-sm bg-blue-500 text-white py-1 px-1 sm:px-3 rounded hover:bg-blue-600 w-full sm:w-auto"
              >
                <span className="hidden sm:inline">Set Turn for {team.name}</span>
                <span className="sm:hidden">Set Turn</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ScoreBoard;
