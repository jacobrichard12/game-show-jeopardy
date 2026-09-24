import React, { useMemo, useState } from "react";
import { getWinners, rankTeams } from "../shared/standings";
import { teamColor } from "../shared/teamColors";
import { TeamState } from "../shared/types";

interface GameOverScreenProps {
  teams: TeamState[];
  isAdmin: boolean;
  onBackToBoard?: () => void;
  onPlayAgain?: () => void;
}

const CONFETTI_COLORS = ["#10b981", "#f43f5e", "#8b5cf6", "#f59e0b", "#67e8f9", "#ffffff"];
const CONFETTI_PIECES = 60;

// Final standings, shown on the TV and the host once the host ends the game
// from Settings. The celebration sound is played by Display (it reacts to the
// gameOver flag turning on); this component is visuals only.
const GameOverScreen: React.FC<GameOverScreenProps> = ({
  teams,
  isAdmin,
  onBackToBoard,
  onPlayAgain,
}) => {
  const [confirmingPlayAgain, setConfirmingPlayAgain] = useState(false);
  const standings = rankTeams(teams);
  const winners = getWinners(teams);
  const isTie = winners.length > 1;

  // Random positions picked once, so re-renders don't make the confetti jump.
  const confetti = useMemo(
    () =>
      Array.from({ length: CONFETTI_PIECES }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 3 + Math.random() * 3,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        wide: Math.random() < 0.5,
      })),
    []
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-white">
      {/* motion-safe: skipped for viewers who ask for reduced motion. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 hidden motion-safe:block">
        {confetti.map((piece, i) => (
          <span
            key={i}
            className={`absolute top-0 rounded-sm animate-confetti-fall ${piece.wide ? "h-2 w-4" : "h-4 w-2"}`}
            style={{
              left: `${piece.left}%`,
              backgroundColor: piece.color,
              animationDelay: `-${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex w-full max-w-4xl flex-col items-center">
        <p className="mb-2 text-lg font-semibold uppercase tracking-[0.3em] text-accent sm:text-2xl">
          Game over
        </p>
        <h1 className="mb-8 text-center font-display text-4xl font-semibold animate-winner-pop sm:text-6xl xl:text-8xl">
          {isTie
            ? "It's a tie!"
            : `${winners[0]?.team.name ?? "Nobody"} wins!`}
        </h1>

        <ol className="flex w-full flex-col gap-3 sm:gap-4">
          {standings.map(({ team, index, rank }) => {
            const color = teamColor(index);
            const isWinner = rank === 1;
            return (
              <li
                key={team.id}
                className={`flex items-center gap-4 rounded-xl border-2 bg-surface/80 px-4 py-3 sm:px-6 sm:py-4 ${color.border} ${
                  isWinner ? `scale-105 ${color.glow}` : "opacity-90"
                }`}
              >
                <span className="w-10 text-center text-2xl font-semibold sm:w-14 sm:text-4xl">
                  {isWinner ? "🏆" : `#${rank}`}
                </span>
                <span className="min-w-0 flex-1 break-words text-2xl font-semibold sm:text-4xl xl:text-5xl">
                  {team.name}
                </span>
                <span className={`text-2xl font-semibold sm:text-4xl xl:text-5xl ${color.text}`}>
                  {team.score}
                </span>
              </li>
            );
          })}
        </ol>

        {isAdmin && (
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {confirmingPlayAgain ? (
              <div className="flex flex-col items-center gap-3 rounded-lg bg-black/60 p-4 text-center">
                <p>Play again? This clears all scores and the board.</p>
                <div className="flex gap-2">
                  <button
                    autoFocus
                    onClick={() => setConfirmingPlayAgain(false)}
                    className="rounded bg-white/20 px-4 py-2 hover:bg-white/30"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmingPlayAgain(false);
                      onPlayAgain?.();
                    }}
                    className="rounded bg-accent px-4 py-2 font-semibold text-ink hover:brightness-110"
                  >
                    Yes, play again
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={onBackToBoard}
                  className="rounded bg-white/20 px-5 py-3 text-lg hover:bg-white/30"
                >
                  ← Back to board
                </button>
                <button
                  onClick={() => setConfirmingPlayAgain(true)}
                  className="rounded bg-accent px-5 py-3 text-lg font-semibold text-ink hover:brightness-110"
                >
                  Play again
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameOverScreen;
