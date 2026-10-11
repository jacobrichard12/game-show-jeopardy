import React, { useEffect, useMemo, useRef } from "react";
import wow from "../assets/wow.mp3";
import { playSound } from "../shared/sound";
import { GameName, GameState } from "../shared/types";

// A board tile's colors (background, number), shared with the TV's tile-pick
// card so the card matches the tile it grows from. Double Jeopardy has its
// own look, which each theme defines (the dj-* colors in index.css).
export function tileColors(isDoubleJeopardy: boolean): { bg: string; value: string } {
  return isDoubleJeopardy
    ? { bg: "bg-dj-tile", value: "text-dj-accent" }
    : { bg: "bg-tile", value: "text-accent" };
}

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
  // TV only: bumped by Display to play the category intro (0 = never).
  introKey?: number;
}

// The last intro this page played. The board remounts every time the game
// returns from a question, so without this the intro would replay each time.
// Intro keys come from nextIntroKey(), one page-wide counter, so they keep
// increasing even if Display remounts (e.g. leaving and rejoining a room).
let lastPlayedIntro = 0;
let introCounter = 0;
export function nextIntroKey(): number {
  introCounter += 1;
  return introCounter;
}
const INTRO_STEP_MS = 300;
// The Double Jeopardy "wow", relative to the TV's master volume.
const DJ_WOW_LEVEL = 0.4;

const GameBoard: React.FC<GameBoardProps> = ({
  isAdmin,
  gameState,
  gameBoardData,
  handleUpdateCurrentGame,
  sendGameStateToServer,
  introKey = 0,
}) => {
  // Decided once per intro, so a re-render mid-animation doesn't cut it off.
  const playIntro = useMemo(() => introKey > lastPlayedIntro, [introKey]);
  useEffect(() => {
    if (playIntro) lastPlayedIntro = introKey;
  }, [playIntro, introKey]);

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
      // Quieter than other sounds: the "wow" clip is mastered loud (owner).
      playSound(wow, DJ_WOW_LEVEL);
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

  // A CSS grid rather than a table. On the TV at lg: the tile rows each take
  // an equal share of whatever height the screen gives the board (1fr), so
  // tiles stretch to fill the page instead of hugging their text. The host's
  // board isn't height-bound (the page scrolls, and each tile has an
  // Enable/Disable button), so its rows stay content-sized with normal
  // padding; stretching there squashed the tiles to one line.
  const fillScreen = !isAdmin;
  return (
    <div className={`p-2 sm:p-4 ${fillScreen ? "lg:flex lg:flex-col lg:flex-1 lg:min-h-0" : ""}`}>
      <div
        style={
          { "--cols": categoryKeys.length, "--rows": rowCount } as React.CSSProperties
        }
        className={`grid grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-1 sm:gap-2 rounded-2xl p-1 sm:p-2 ${
          fillScreen
            ? "lg:flex-1 lg:min-h-0 lg:[grid-template-rows:auto_repeat(var(--rows),minmax(0,1fr))]"
            : ""
        } ${
          isDoubleJeopardy ? "bg-dj-ink" : "bg-ink"
        }`}
      >
        {categoryKeys.map((categoryKey, index) => {
          const category = gameBoardData[categoryKey];
          return (
            <div
              // Keyed by the intro too, so a new intro remounts (replays) it.
              key={`${category.gameName}-${playIntro ? introKey : 0}`}
              style={playIntro ? { animationDelay: `${index * INTRO_STEP_MS}ms` } : undefined}
              className={`flex items-center justify-center break-words leading-tight p-2 sm:p-4 md:p-6 lg:px-2 lg:py-[1.5vh] text-sm sm:text-xl md:text-3xl lg:text-[clamp(1.25rem,3vh,3rem)] font-display font-semibold text-center text-white rounded-xl ${
                isDoubleJeopardy ? "bg-dj-surface" : "bg-surface"
              } ${playIntro ? "motion-safe:animate-category-intro" : ""}`}
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
                  className={`flex-1 w-full min-w-0 flex items-center justify-center text-base sm:text-2xl md:text-4xl lg:text-[clamp(1.5rem,5vh,5rem)] font-display font-semibold p-2 sm:p-4 md:p-6 ${
                    fillScreen ? "lg:px-2 lg:py-0" : ""
                  } rounded-xl transition focus:outline-none focus:ring-2 focus:ring-accent ${
                    answered
                      ? // Answered tiles go blank, like a used square on the real board.
                        "bg-white/5 text-transparent cursor-not-allowed"
                      : `${tileColors(isDoubleJeopardy).bg} ${
                          tileColors(isDoubleJeopardy).value
                        } hover:brightness-125`
                  }`}
                  onClick={() =>
                    handleUpdateCurrentGame(
                      category.gameName as GameName,
                      pointValue
                    )
                  }
                  disabled={answered}
                  // Found by the TV's tile-pick card, which grows from here.
                  data-tile={`${category.gameName}-${pointValue}`}
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
