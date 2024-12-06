import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GameState, Team } from "../App";
import { GameBoardData } from "./GameBoard";
import FamilyFeud from "./FamilyFeud";
import Millionaire from "./Millionaire";
import { GameName } from "../types/common";

interface PageWrapperProps {
  gameState: GameState;
  gameBoardData: { [key: string]: GameBoardData };
  handleAddPoints: (team: Team, points: number) => void;
  handleQuestionComplete: (
    category: string,
    value: number,
    gameState: GameState
  ) => void;
  handleUpdateCurrentGame: (newGame: GameName, points: number) => void;
}

const PageWrapper: React.FC<PageWrapperProps> = ({
  gameState,
  gameBoardData,
  handleAddPoints,
  handleQuestionComplete: handleQuestionComplete,
  handleUpdateCurrentGame,
}) => {
  const { categoryRoute, value } = useParams<{
    categoryRoute: string;
    value: string;
  }>();
  const navigate = useNavigate();

  const title =
    gameBoardData[categoryRoute!]?.categoryName || "Unknown Category";

  // Local state to track if points have been awarded and whether to show the child content
  const [pointsAwarded, setPointsAwarded] = useState(false);
  const [showChildren, setShowChildren] = useState(false);

  const handleBackClick = () => {
    handleUpdateCurrentGame(GameName.BOARD, 0);
    navigate(-1); // Navigate back to the previous page
  };

  const getContentComponent = () => {
    switch (categoryRoute) {
      case GameName.FAMILY_FEUD:
        return <FamilyFeud />;
      case GameName.MILLIONAIRE:

        return <Millionaire />;
      default:
        return <div>Content not available for this category.</div>;
    }
  };

  return (
    <div className="p-4">
      {/* Back Button */}
      <button
        onClick={handleBackClick}
        className="mb-4 p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Back
      </button>

      {/* Title Section */}
      {title && !gameState.currentGame.questionVisibile && (
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold mb-2">
            {title} - {value} Points
          </h1>
        </div>
      )}

      {/* Content Section */}
      {gameState.currentGame.questionVisibile && (
        <div className="bg-white p-4 rounded shadow-lg">
          {getContentComponent()}
        </div>
      )}

      {/* Scoreboard */}
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

export default PageWrapper;
