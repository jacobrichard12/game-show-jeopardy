import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameState, Team } from "../App";
import { GameName } from "../types/common";

// Define the structure of the game data
export interface GameBoardData {
  categoryRoute: string;
  categoryName: string;
  points: number[];
}

interface GameBoardProps {
  gameState: GameState;
  gameBoardData: { [key: string]: GameBoardData };
  handleUpdateCurrentGame: (newGame: GameName, value: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, gameBoardData, handleUpdateCurrentGame }) => {
  const navigate = useNavigate();
  const [animatingTile, setAnimatingTile] = useState<{
    category: string;
    value: number;
  } | null>(null);

  const handleClick = (categoryRoute: string, value: number) => {
    handleUpdateCurrentGame(categoryRoute as GameName, value);
    navigate(`/${categoryRoute}/${value}`);
    
    // setAnimatingTile({ category: categoryRoute, value });
    // setTimeout(() => {
    //   navigate(`/${categoryRoute}/${value}`);
    //   setAnimatingTile(null);
    // }, 1000); // Animation duration
  };

  // Check if the question has already been answered
  const hasQuestionBeenAnswered = (categoryRoute: string, value: number) => {
    return gameState.answered[categoryRoute]?.includes(value) ?? false;
  };

  return (
    <div className="p-4">
      {/* Game board */}
      <div className="overflow-x-auto mb-6">
        <table className="table-auto border-collapse w-full">
          <thead>
            <tr>
              {Object.keys(gameBoardData).map((categoryKey) => {
                const category = gameBoardData[categoryKey];
                return (
                  <th
                    key={category.categoryRoute}
                    className="p-4 text-lg font-bold border-b text-center bg-gray-200"
                  >
                    {category.categoryName}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {gameBoardData[Object.keys(gameBoardData)[0]]?.points.map(
              (_, rowIndex) => (
                <tr key={rowIndex}>
                  {Object.keys(gameBoardData).map((categoryKey) => {
                    const category = gameBoardData[categoryKey];
                    const pointValue = category.points[rowIndex];
                    const isAnimating =
                      animatingTile?.category === category.categoryRoute &&
                      animatingTile?.value === pointValue;

                    return (
                      <td
                        key={`${category.categoryName}-${rowIndex}`}
                        className="p-4 text-center border"
                      >
                        <button
                          className={`text-lg font-semibold p-3 rounded-lg ${
                            isAnimating
                              ? "animate-spin"
                              : hasQuestionBeenAnswered(
                                  category.categoryRoute,
                                  pointValue
                                )
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-500 hover:bg-blue-600"
                          } text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          onClick={() =>
                            handleClick(category.categoryRoute, pointValue)
                          }
                          disabled={hasQuestionBeenAnswered(
                            category.categoryRoute,
                            pointValue
                          )}
                        >
                          ${pointValue}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

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

export default GameBoard;
