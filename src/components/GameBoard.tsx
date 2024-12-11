import React from "react";
import { GameName, GameState } from "../types/common";

export interface GameBoardData {
  gameName: string;
  gameTitle: string;
  points: number[];
}

interface GameBoardProps {
  isAdmin: boolean;
  gameState: GameState;
  gameBoardData: { [key: string]: GameBoardData };
  handleUpdateCurrentGame: (newGame: GameName, value: number) => void;
  sendGameStateToServer: (updatedGameState: GameState) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({
  isAdmin,
  gameState,
  gameBoardData,
  handleUpdateCurrentGame,
  sendGameStateToServer,
}) => {
  // Check if the question has already been answered
  const hasQuestionBeenAnswered = (gameName: string, value: number) => {
    return gameState.answered[gameName]?.includes(value) ?? false;
  };

  // Get whether it's Double Jeopardy
  const isDoubleJeopardy = gameState.isDoubleJeopardy;

  // Function to toggle the disabled state of a tile
  const toggleEnableDisableState = (gameName: string, pointValue: number) => {
    if (!isAdmin) return;

    const updatedGameState = { ...gameState };
    if (!updatedGameState.answered[gameName]) {
      updatedGameState.answered[gameName] = [];
      updatedGameState.answered[gameName].push(pointValue);
    } else if (updatedGameState.answered[gameName].includes(pointValue)) {
      updatedGameState.answered[gameName] = updatedGameState.answered[
        gameName
      ].filter((value) => value !== pointValue);
    } else {
      updatedGameState.answered[gameName].push(pointValue);
    }

    // Update the game state with the modified board data
    sendGameStateToServer(updatedGameState);
  };

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
                        <div className="flex items-center justify-center">
                          <button
                            className={`text-xl font-semibold p-5 rounded-lg ${
                              hasQuestionBeenAnswered(
                                category.gameName,
                                pointValue
                              )
                                ? "bg-gray-400 cursor-not-allowed"
                                : hasQuestionBeenAnswered(
                                  category.gameName,
                                  pointValue
                                )
                                ? "bg-gray-500 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                            } text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            onClick={() =>
                              handleUpdateCurrentGame(
                                category.gameName as GameName,
                                pointValue
                              )
                            }
                            disabled={hasQuestionBeenAnswered(category.gameName, pointValue) || hasQuestionBeenAnswered(
                              category.gameName,
                              pointValue
                            )}
                          >
                            ${pointValue}
                          </button>
                          {/* Toggle disable/enable button */}
                          {isAdmin && (
                            <button
                              onClick={() => toggleEnableDisableState(category.gameName, pointValue)}
                              className="ml-2 p-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
                            >
                              {hasQuestionBeenAnswered(
                                category.gameName,
                                pointValue
                              ) ? "Enable" : "Disable"}
                            </button>
                          )}
                        </div>
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
