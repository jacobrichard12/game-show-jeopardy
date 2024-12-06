import React, { useState } from "react";
import { GameState, Team } from "../App";
import { GameName } from "../types/common";
import FamilyFeudAdmin from "./FamilyFeudAdmin";

interface AdminPageWrapperProps {
  gameState: GameState;
  handleAddPoints: (team: Team, points: number, gameName: GameName) => void;
  handleRevealQuestion: () => void;
}

const AdminPageWrapper: React.FC<AdminPageWrapperProps> = ({
  gameState,
  handleAddPoints,
  handleRevealQuestion,
}) => {
  const havePointsBeenAwarded = () => {
    return (
      gameState.answered[gameState.currentGame.gameName] &&
      gameState.answered[gameState.currentGame.gameName].includes(
        gameState.currentGame.value
      )
    );
  };

  const handleAwardPointsClick = (team: Team) => {
    handleAddPoints(
      team,
      gameState.currentGame.value,
      gameState.currentGame.gameName
    );
  };

  const getGameAdminComponent = () => {
    switch (gameState.currentGame.gameName) {
      //   case GameName.FAMILY_FEUD:
      //     return <FamilyFeudAdmin />;
      default:
        return <div>Admin child content</div>;
    }
  };

  const getAdminGameBoardPage = () => {
    return (
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-2">Admin Page - GameBoard</h1>
        <h2>Someone is selecting something on the board...</h2>
      </div>
    );
  };

  const getChildAdminGamePage = () => {
    return (
      <div className="p-4">
        {/* Title Section */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">
            Admin Page - {gameState.currentGame.gameName} -{" "}
            {gameState.currentGame.value}
          </h1>
          {!gameState.currentGame.questionVisibile && (
            <button
              onClick={handleRevealQuestion}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Next
            </button>
          )}
        </div>

        {/* Content Section */}
        {gameState.currentGame.questionVisibile && (
          <div className="bg-white p-4 rounded shadow-lg">
            {getGameAdminComponent()}
          </div>
        )}

        {/* Add Points Buttons */}
        {gameState.currentGame.questionVisibile && (
          <div className="flex justify-around items-center">
            <button
              onClick={() => handleAwardPointsClick(Team.TeamA)}
              disabled={havePointsBeenAwarded()} // Disable if points have been awarded
              className={`p-2 rounded ${
                havePointsBeenAwarded()
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              Add {gameState.currentGame.value} points to{" "}
              {gameState[Team.TeamA].name}
            </button>
            <button
              onClick={() => handleAwardPointsClick(Team.TeamB)}
              disabled={havePointsBeenAwarded()} // Disable if points have been awarded
              className={`p-2 rounded ${
                havePointsBeenAwarded()
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              Add {gameState.currentGame.value} points to{" "}
              {gameState[Team.TeamB].name}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {gameState.currentGame.gameName === GameName.BOARD
        ? getAdminGameBoardPage()
        : getChildAdminGamePage()}
      <div className="flex justify-around items-center">
        <div className="p-4 border rounded-lg shadow-md bg-white w-1/4 text-center">
          <h3 className="text-lg font-bold mb-2">
            {gameState[Team.TeamA].name}
          </h3>
          <p className="text-2xl font-semibold">
            {gameState[Team.TeamA].score}
          </p>
        </div>
        <div className="p-4 border rounded-lg shadow-md bg-white w-1/4 text-center">
          <h3 className="text-lg font-bold mb-2">
            {gameState[Team.TeamB].name}
          </h3>
          <p className="text-2xl font-semibold">
            {gameState[Team.TeamB].score}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPageWrapper;
