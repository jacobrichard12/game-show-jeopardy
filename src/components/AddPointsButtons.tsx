import React from "react";
import { teamColor } from "../shared/teamColors";
import { GameName, GameState } from "../shared/types";

interface AdminPointsButtonsProps {
  gameState: GameState;
  handleAddPoints: (
    teamId: string,
    points: number,
    gameName: GameName,
    noPointsOverride: boolean
  ) => void;
}

const havePointsBeenAwarded = (gameState: GameState) => {
  if (gameState.isDoubleJeopardy) {
    return (
      gameState.doubleJeopardyAnswered[gameState.currentGame.gameName] &&
      gameState.doubleJeopardyAnswered[gameState.currentGame.gameName].includes(
        gameState.currentGame.value
      )
    );
  }
  return (
    gameState.answered[gameState.currentGame.gameName] &&
    gameState.answered[gameState.currentGame.gameName].includes(
      gameState.currentGame.value
    )
  );
};

const AdminPointsButtons: React.FC<AdminPointsButtonsProps> = ({
  gameState,
  handleAddPoints,
}) => {
  const handleAwardPointsClick = (teamId: string, noPointsOverride: boolean) => {
    handleAddPoints(
      teamId,
      gameState.currentGame.value,
      gameState.currentGame.gameName,
      noPointsOverride
    );
  };

  const disabled = !!havePointsBeenAwarded(gameState);

  return (
    <div className="flex flex-wrap justify-around items-center gap-2">
      {gameState.teams.map((team, index) => (
        <button
          key={team.id}
          onClick={() => handleAwardPointsClick(team.id, false)}
          disabled={disabled}
          className={`p-2 rounded text-white ${
            disabled
              ? "bg-gray-400 text-gray-700 cursor-not-allowed"
              : teamColor(index).button
          }`}
        >
          Add {gameState.currentGame.value} points to {team.name}
        </button>
      ))}
    </div>
  );
};

// Rendered separately (below the scoreboard) since it isn't tied to any one
// team; the tile still gets marked answered, nobody's score changes.
export const NoPointsButton: React.FC<AdminPointsButtonsProps> = ({
  gameState,
  handleAddPoints,
}) => {
  const disabled = !!havePointsBeenAwarded(gameState);
  return (
    <div className="flex justify-center mt-3">
      <button
        onClick={() =>
          handleAddPoints(
            gameState.teams[0].id,
            gameState.currentGame.value,
            gameState.currentGame.gameName,
            true
          )
        }
        disabled={disabled}
        className={`p-2 rounded ${
          disabled
            ? "bg-gray-400 text-gray-700 cursor-not-allowed"
            : "bg-blue-500 hover:bg-blue-600 text-white"
        }`}
      >
        No One Gets Points
      </button>
    </div>
  );
};

export default AdminPointsButtons;
