import React from "react";
import { GameName, GameState } from "../shared/types";
import FamilyFeud from "./FamilyFeud";
import GameBoard, { GameBoardData } from "./GameBoard";
import HeadToHead from "./HeadToHead";
import Millionaire from "./Millionaire";
import Minute from "./Minute";
import QuestionWrapper from "./QuestionWrapper";
import ScoreBoard from "./Scoreboard";
import Timer from "./Timer";

interface PageWrapperProps {
  gameState: GameState;
  gameBoardData: { [key: string]: GameBoardData };
}

const PageWrapper: React.FC<PageWrapperProps> = ({
  gameState,
  gameBoardData,
}) => {
  const getComponent = (): React.ReactNode => {
    if (gameState.showTimer) {
      return <Timer/>;
    }
    switch (gameState.currentGame.gameName) {
      case GameName.BOARD:
        return (
          <GameBoard
            isAdmin={false}
            gameState={gameState}
            gameBoardData={gameBoardData}
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
      default:
        return <div>Content not available for this category.</div>;
    }
  };

  return (
    // At lg: and up the display is exactly one screen tall: the scoreboard is
    // pinned to the bottom and the board/question area takes the rest (and
    // scrolls internally only as a last resort), so scores never fall below
    // the fold on a wide-but-short window.
    <div className="p-2 sm:p-4 lg:h-screen lg:flex lg:flex-col lg:gap-2 lg:overflow-hidden">
      <div className="p-2 lg:flex lg:flex-col lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
        {getComponent()}
      </div>
      <div className="lg:shrink-0">
        <ScoreBoard gameState={gameState} isAdmin={false} />
      </div>
    </div>
  );
};

export default PageWrapper;
