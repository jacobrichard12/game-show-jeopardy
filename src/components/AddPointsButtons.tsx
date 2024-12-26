import React from "react";
import { GameName, GameState, Team } from "../shared/types";

interface AdminPointsButtonsProps {
  gameState: GameState;
  handleAddPoints: (
    team: Team,
    points: number,
    gameName: GameName,
    noPointsOverride: boolean
  ) => void;
}

const AdminPointsButtons: React.FC<AdminPointsButtonsProps> = ({
  gameState,
  handleAddPoints,
}) => {
  const havePointsBeenAwarded = () => {
    if (gameState.isDoubleJeopardy) {
      return (
        gameState.doubleJeopardyAnswered[gameState.currentGame.gameName] &&
        gameState.doubleJeopardyAnswered[
          gameState.currentGame.gameName
        ].includes(gameState.currentGame.value)
      );
    } else {
      return (
        gameState.answered[gameState.currentGame.gameName] &&
        gameState.answered[gameState.currentGame.gameName].includes(
          gameState.currentGame.value
        )
      );
    }
  };

  const handleAwardPointsClick = (team: Team, noPointsOverride: boolean) => {
    handleAddPoints(
      team,
      gameState.currentGame.value,
      gameState.currentGame.gameName,
      noPointsOverride
    );
  };

  return (
    <div className="flex justify-around items-center">
      <button
        onClick={() => handleAwardPointsClick(Team.TeamA, false)}
        disabled={havePointsBeenAwarded()} // Disable if points have been awarded
        className={`p-2 rounded ${
          havePointsBeenAwarded()
            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
            : "bg-green-500 hover:bg-green-600 text-white"
        }`}
      >
        Add {gameState.currentGame.value} points to {gameState[Team.TeamA].name}
      </button>

      <button
        onClick={() => handleAwardPointsClick(Team.TeamA, true)}
        disabled={havePointsBeenAwarded()} // Disable if points have been awarded
        className={`p-2 rounded ${
          havePointsBeenAwarded()
            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        No One Gets Points
      </button>

      <button
        onClick={() => handleAwardPointsClick(Team.TeamB, false)}
        disabled={havePointsBeenAwarded()} // Disable if points have been awarded
        className={`p-2 rounded ${
          havePointsBeenAwarded()
            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
            : "bg-red-500 hover:bg-red-600 text-white"
        }`}
      >
        Add {gameState.currentGame.value} points to {gameState[Team.TeamB].name}
      </button>
    </div>
  );
};

export default AdminPointsButtons;
