import React, { useEffect, useRef } from "react";
import wow from "../assets/wow.mp3";
import { GameName, GameState } from "../shared/types";

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
    if (gameState.isDoubleJeopardy) {
      return (
        gameState.doubleJeopardyAnswered[gameName]?.includes(value) ?? false
      );
    } else {
      return gameState.answered[gameName]?.includes(value) ?? false;
    }
  };

  // Get whether it's Double Jeopardy
  const isDoubleJeopardy = gameState.isDoubleJeopardy;

  // The "wow" sting plays when Double Jeopardy is switched on. Detected here
  // (rather than played directly from the admin's toggle click) so it fires
  // on the display copy of this component instead of the admin's — both
  // render from the same broadcast state, so gating on isAdmin is what
  // lets the sound come from the "watch" tab rather than the control panel.
  const wasDoubleJeopardy = useRef(isDoubleJeopardy);
  useEffect(() => {
    if (!isAdmin && isDoubleJeopardy && !wasDoubleJeopardy.current) {
      new Audio(wow).play();
    }
    wasDoubleJeopardy.current = isDoubleJeopardy;
  }, [isAdmin, isDoubleJeopardy]);

  // Function to toggle the disabled state of a tile
  const toggleEnableDisableState = (gameName: string, pointValue: number) => {
    if (!isAdmin) return;
    const updatedGameState = { ...gameState };

    const answered = updatedGameState.isDoubleJeopardy
      ? updatedGameState.doubleJeopardyAnswered
      : updatedGameState.answered;

    if (!answered[gameName]) {
      answered[gameName] = [];
      answered[gameName].push(pointValue);
    } else if (answered[gameName].includes(pointValue)) {
      answered[gameName] = answered[gameName].filter(
        (value) => value !== pointValue
      );
    } else {
      answered[gameName].push(pointValue);
    }

    if (gameState.isDoubleJeopardy) {
      updatedGameState.doubleJeopardyAnswered = answered;
    } else {
      updatedGameState.answered = answered;
    }

    // Update the game state with the modified board data
    sendGameStateToServer(updatedGameState);
  };

  return (
    <div className={`p-4 ${isDoubleJeopardy ? "bg-gray-800 text-white" : ""}`}>
      {/* Game board */}
      <div className="overflow-x-auto mb-6">
        <table
          className={`table-auto border-collapse w-full ${
            isDoubleJeopardy ? "bg-gray-700" : ""
          }`}
        >
          <thead>
            <tr>
              {Object.keys(gameBoardData).map((categoryKey) => {
                const category = gameBoardData[categoryKey];
                return (
                  <th
                    key={category.gameName}
                    style={{ width: "125px" }} // Set a fixed width for the columns
                    className={`p-6 text-3xl font-bold border-b text-center ${
                      isDoubleJeopardy
                        ? "bg-gray-600 text-white"
                        : "bg-gray-200"
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
                          isDoubleJeopardy
                            ? "border-gray-600"
                            : "border-gray-300"
                        }`}
                      >
                        <div className="flex items-center justify-center">
                          <button
                            className={`text-4xl font-semibold p-6 rounded-lg ${
                              hasQuestionBeenAnswered(
                                category.gameName,
                                pointValue
                              )
                                ? "bg-gray-400 cursor-not-allowed"
                                : "bg-blue-500 hover:bg-blue-600"
                            } text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
                            onClick={() =>
                              handleUpdateCurrentGame(
                                category.gameName as GameName,
                                pointValue
                              )
                            }
                            disabled={hasQuestionBeenAnswered(
                              category.gameName,
                              pointValue
                            )}
                          >
                            ${pointValue}
                          </button>
                          {/* Toggle disable/enable button */}
                          {isAdmin && (
                            <button
                              onClick={() =>
                                toggleEnableDisableState(
                                  category.gameName,
                                  pointValue
                                )
                              }
                              className="ml-2 p-1 bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
                            >
                              {hasQuestionBeenAnswered(
                                category.gameName,
                                pointValue
                              )
                                ? "Enable"
                                : "Disable"}
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
