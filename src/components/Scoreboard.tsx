import React, { useEffect, useRef, useState } from "react";
import { GameName, GameState, Team } from "../shared/types";

interface ScoreBoardProps {
  isAdmin: boolean;
  gameState: GameState;
  handleUpdateTurn?: (team: Team) => void;
}

// How long the score "bounce" animation plays after a score change.
const BOUNCE_DURATION_MS = 2000;

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  isAdmin,
  gameState,
  handleUpdateTurn,
}) => {
  const [bouncingTeam, setBouncingTeam] = useState<Team | null>(null);
  // A ref (not state) because writing it must not itself re-trigger the
  // effect below — it only exists to remember the previous render's scores.
  const prevScores = useRef({
    [Team.TeamA]: gameState[Team.TeamA].score,
    [Team.TeamB]: gameState[Team.TeamB].score,
  });

  const isTeamATurn = gameState.whoseTurn === Team.TeamA;
  const isTeamBTurn = gameState.whoseTurn === Team.TeamB;

  const scoreA = gameState[Team.TeamA].score;
  const scoreB = gameState[Team.TeamB].score;

  useEffect(() => {
    // Nothing changed since the last render — skip.
    if (scoreA === prevScores.current[Team.TeamA] && scoreB === prevScores.current[Team.TeamB]) {
      return;
    }

    // Trigger the bounce for whichever team's score changed.
    if (scoreA !== prevScores.current[Team.TeamA]) {
      setBouncingTeam(Team.TeamA);
    } else if (scoreB !== prevScores.current[Team.TeamB]) {
      setBouncingTeam(Team.TeamB);
    }
    const timer = setTimeout(() => setBouncingTeam(null), BOUNCE_DURATION_MS);

    prevScores.current = { [Team.TeamA]: scoreA, [Team.TeamB]: scoreB };

    return () => clearTimeout(timer);
  }, [scoreA, scoreB]);

  return (
    <div className="flex justify-around items-center">
      {/* Team A Score */}
      <div
        className={`p-4 border rounded-lg shadow-md w-1/4 text-center ${
          isTeamATurn ? "bg-green-200" : "bg-white"
        }`}
      >
        <h3 className="text-5xl font-bold mb-2">{gameState[Team.TeamA].name}</h3>
        <p
          className={`text-5xl font-semibold ${
            bouncingTeam === Team.TeamA ? "animate-bounce" : ""
          }`}
        >
          {gameState[Team.TeamA].score}
        </p>
        {isAdmin && handleUpdateTurn && gameState.currentGame.gameName === GameName.BOARD && (
          <button
            onClick={() => handleUpdateTurn(Team.TeamA)}
            className="mt-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600"
          >
            Set Turn for {gameState[Team.TeamA].name}
          </button>
        )}
      </div>

      {/* Team B Score */}
      <div
        className={`p-4 border rounded-lg shadow-md w-1/4 text-center ${
          isTeamBTurn ? "bg-green-200" : "bg-white"
        }`}
      >
        <h3 className="text-5xl font-bold mb-2">{gameState[Team.TeamB].name}</h3>
        <p
          className={`text-5xl font-semibold ${
            bouncingTeam === Team.TeamB ? "animate-bounce" : ""
          }`}
        >
          {gameState[Team.TeamB].score}
        </p>
        {isAdmin && handleUpdateTurn && gameState.currentGame.gameName === GameName.BOARD && (
          <button
            onClick={() => handleUpdateTurn(Team.TeamB)}
            className="mt-2 bg-blue-500 text-white py-1 px-3 rounded hover:bg-blue-600"
          >
            Set Turn for {gameState[Team.TeamB].name}
          </button>
        )}
      </div>
    </div>
  );
};

export default ScoreBoard;
