import React, { useEffect, useRef } from "react";
import wow from "../assets/wow.mp3";
import { createAudio } from "../shared/sound";
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
      createAudio(wow).play();
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

  const categoryKeys = Object.keys(gameBoardData);
  const rowCount = gameBoardData[categoryKeys[0]]?.points.length ?? 0;

  // A CSS grid rather than a table: at lg: the tile rows each take an equal
  // share of whatever height the screen gives the board (1fr), so tiles
  // stretch to fill the page instead of hugging their text. Below lg the rows
  // are content-sized like before.
  return (
    <div className="p-2 sm:p-4 lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
      <div
        style={
          { "--cols": categoryKeys.length, "--rows": rowCount } as React.CSSProperties
        }
        className={`grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-1 sm:gap-2 rounded-2xl p-1 sm:p-2 lg:flex-1 lg:min-h-0 lg:[grid-template-rows:auto_repeat(var(--rows),minmax(0,1fr))] ${
          isDoubleJeopardy ? "bg-[#2a0f1e]" : "bg-ink"
        }`}
      >
        {categoryKeys.map((categoryKey) => {
          const category = gameBoardData[categoryKey];
          return (
            <div
              key={category.gameName}
              className={`flex items-center justify-center break-words leading-tight p-2 sm:p-4 md:p-6 lg:px-2 lg:py-[1.5vh] text-sm sm:text-xl md:text-3xl lg:text-[clamp(1.25rem,3vh,3rem)] font-display font-semibold text-center text-white rounded-xl ${
                isDoubleJeopardy ? "bg-rose-900" : "bg-surface"
              }`}
            >
              {category.gameTitle}
            </div>
          );
        })}

        {Array.from({ length: rowCount }, (_, rowIndex) =>
          categoryKeys.map((categoryKey) => {
            const category = gameBoardData[categoryKey];
            let pointValue = category.points[rowIndex];

            // If Double Jeopardy, double the point value
            if (isDoubleJeopardy) {
              pointValue = pointValue * 2;
            }

            const answered = hasQuestionBeenAnswered(
              category.gameName,
              pointValue
            );

            return (
              <div
                key={`${category.gameName}-${rowIndex}`}
                className="flex flex-col items-stretch gap-1 min-h-0"
              >
                <button
                  className={`flex-1 w-full min-w-0 flex items-center justify-center text-base sm:text-2xl md:text-4xl lg:text-[clamp(1.5rem,5vh,5rem)] font-display font-semibold p-2 sm:p-4 md:p-6 lg:px-2 lg:py-0 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-accent ${
                    answered
                      ? // Answered tiles go blank, like a used square on the real board.
                        "bg-white/5 text-transparent cursor-not-allowed"
                      : `${
                          isDoubleJeopardy
                            ? "bg-rose-800 text-amber-200"
                            : "bg-tile text-accent"
                        } hover:brightness-125`
                  }`}
                  onClick={() =>
                    handleUpdateCurrentGame(
                      category.gameName as GameName,
                      pointValue
                    )
                  }
                  disabled={answered}
                >
                  ${pointValue}
                </button>
                {/* Toggle disable/enable button */}
                {isAdmin && (
                  <button
                    onClick={() =>
                      toggleEnableDisableState(category.gameName, pointValue)
                    }
                    className="py-0.5 px-1 text-xs sm:text-sm whitespace-nowrap bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none"
                  >
                    {answered ? "Enable" : "Disable"}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default GameBoard;
