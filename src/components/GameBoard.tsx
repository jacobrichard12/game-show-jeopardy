import React from "react";
import { GameName, GameState } from "../types/common";

export interface GameBoardData {
  gameName: string;
  gameTitle: string;
  points: number[];
}

interface GameBoardProps {
  gameState: GameState;
  gameBoardData: { [key: string]: GameBoardData };
  handleUpdateCurrentGame: (newGame: GameName, value: number) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  gameBoardData,
  handleUpdateCurrentGame,
}) => {
  // Check if the question has already been answered
  const hasQuestionBeenAnswered = (categoryRoute: string, value: number) => {
    return gameState.answered[categoryRoute]?.includes(value) ?? false;
  };

  // Get whether it's Double Jeopardy
  const isDoubleJeopardy = gameState.isDoubleJeopardy;

  return (
    <div className={`p-4 ${isDoubleJeopardy ? "bg-gray-800 text-white" : ""}`}>
      {/* Game board */}
      <div className="overflow-x-auto mb-6">
        <table
          className={`table-auto border-collapse w-full ${isDoubleJeopardy ? "bg-gray-700" : ""}`}
        >
          <thead>
            <tr>
              {Object.keys(gameBoardData).map((categoryKey) => {
                const category = gameBoardData[categoryKey];
                return (
                  <th
                    key={category.gameName}
                    className={`p-4 text-lg font-bold border-b text-center ${
                      isDoubleJeopardy ? "bg-gray-600 text-white" : "bg-gray-200"
                    }`}
                  >
                    {category.gameTitle}
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
                    let pointValue = category.points[rowIndex];

                    // If Double Jeopardy, double the point value
                    if (isDoubleJeopardy) {
                      pointValue = pointValue * 2;
                    }

                    return (
                      <td
                        key={`${category.gameName}-${rowIndex}`}
                        className={`p-4 text-center border ${
                          isDoubleJeopardy ? "border-gray-600" : "border-gray-300"
                        }`}
                      >
                        <button
                          className={`text-xl font-semibold p-5 rounded-lg ${
                            hasQuestionBeenAnswered(
                              category.gameName,
                              pointValue
                            )
                              ? "bg-gray-400 cursor-not-allowed"
                              : "bg-blue-500 hover:bg-blue-600"
                          } text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                          onClick={() => handleUpdateCurrentGame(
                            category.gameName as GameName,
                            pointValue
                          )}
                          disabled={hasQuestionBeenAnswered(
                            category.gameName,
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
    </div>
  );
};

export default GameBoard;
