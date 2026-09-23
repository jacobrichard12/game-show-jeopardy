import React from "react";
import { GameName, GameState } from "../shared/types";
import FamilyFeud from "./FamilyFeud";
import FitToScreen from "./FitToScreen";
import { boardData } from "./boards";
import GameBoard from "./GameBoard";
import HeadToHead from "./HeadToHead";
import Millionaire from "./Millionaire";
import Minute from "./Minute";
import { PARTY_GAME_COMPONENTS } from "./partyGameComponents";
import QuestionWrapper from "./QuestionWrapper";
import ScoreBoard from "./Scoreboard";
import Timer from "./Timer";

interface PageWrapperProps {
  gameState: GameState;
}

const PageWrapper: React.FC<PageWrapperProps> = ({ gameState }) => {
  const getComponent = (): React.ReactNode => {
    if (gameState.showTimer) {
      return (
        <Timer
          playing={gameState.timerPlaying ?? false}
          restartToken={gameState.timerRestart ?? 0}
        />
      );
    }
    switch (gameState.currentGame.gameName) {
      case GameName.BOARD:
        return (
          <GameBoard
            isAdmin={false}
            gameState={gameState}
            gameBoardData={boardData(gameState.boardPage)}
            handleUpdateCurrentGame={() => {}}
            sendGameStateToServer={() => {}}
          />
        );
      case GameName.FAMILY_FEUD:
        return (
          <QuestionWrapper
            gameState={gameState}
            question={
              <FamilyFeud
                isAdmin={false}
                gameState={gameState}
                sendGameStateToServer={() => {}}
              />
            }
          />
        );
      case GameName.MINUTE:
        return (
          <QuestionWrapper
            gameState={gameState}
            question={
              <Minute
                isAdmin={false}
                gameState={gameState}
                sendGameStateToServer={() => {}}
              />
            }
          />
        );
      case GameName.HEAD_TO_HEAD:
        return (
          <QuestionWrapper
            gameState={gameState}
            question={
              <HeadToHead
                isAdmin={false}
                gameState={gameState}
                sendGameStateToServer={() => {}}
              />
            }
          />
        );
      case GameName.MILLIONAIRE:
        return (
          <QuestionWrapper
            gameState={gameState}
            question={
              <Millionaire
                isAdmin={false}
                gameState={gameState}
                sendGameStateToServer={() => {}}
              />
            }
          />
        );
      default: {
        const PartyGame = PARTY_GAME_COMPONENTS[gameState.currentGame.gameName];
        if (!PartyGame) return <div>Content not available for this category.</div>;
        return (
          <QuestionWrapper
            gameState={gameState}
            question={
              <PartyGame
                isAdmin={false}
                gameState={gameState}
                sendGameStateToServer={() => {}}
              />
            }
          />
        );
      }
    }
  };

  // Questions are scaled to fill the space above the scoreboard exactly, so
  // a reveal never pushes anything below the fold. The board and the timer
  // video size themselves to the screen already.
  const component = getComponent();
  const fitsToScreen =
    !gameState.showTimer && gameState.currentGame.gameName !== GameName.BOARD;

  return (
    // At lg: and up the display is exactly one screen tall: the scoreboard is
    // pinned to the bottom and the board/question area takes the rest (and
    // scrolls internally only as a last resort), so scores never fall below
    // the fold on a wide-but-short window.
    <div className="p-2 sm:p-4 lg:h-screen lg:flex lg:flex-col lg:gap-2 lg:overflow-hidden">
      <div className="p-2 lg:flex lg:flex-col lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
        {fitsToScreen ? <FitToScreen>{component}</FitToScreen> : component}
      </div>
      <div className="lg:shrink-0">
        <ScoreBoard gameState={gameState} isAdmin={false} />
      </div>
    </div>
  );
};

export default PageWrapper;
