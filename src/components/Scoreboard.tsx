import React, { useEffect, useState } from "react";
import { GameName, GameState, Team } from "../types/common";

interface ScoreBoardProps {
  isAdmin: boolean;
  gameState: GameState;
  handleUpdateTurn?: (team: Team) => void;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({
  isAdmin,
  gameState,
  handleUpdateTurn,
}) => {
  const [bouncingTeam, setBouncingTeam] = useState<Team | null>(null);
  const [prevScores, setPrevScores] = useState({
    [Team.TeamA]: gameState[Team.TeamA].score,
    [Team.TeamB]: gameState[Team.TeamB].score,
  });

  const isTeamATurn = gameState.whoseTurn === Team.TeamA;
  const isTeamBTurn = gameState.whoseTurn === Team.TeamB;

  useEffect(() => {
    // Check for changes in scores and trigger bounce for the appropriate team
    if (gameState[Team.TeamA].score !== prevScores[Team.TeamA]) {
      setBouncingTeam(Team.TeamA);
      setTimeout(() => setBouncingTeam(null), 2000); // Reset bounce after 2 seconds
    } else if (gameState[Team.TeamB].score !== prevScores[Team.TeamB]) {
      setBouncingTeam(Team.TeamB);
      setTimeout(() => setBouncingTeam(null), 2000); // Reset bounce after 2 seconds
    }

    // Update previous scores
    setPrevScores({
      [Team.TeamA]: gameState[Team.TeamA].score,
      [Team.TeamB]: gameState[Team.TeamB].score,
    });
  }, [gameState[Team.TeamA].score, gameState[Team.TeamB].score]);

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
