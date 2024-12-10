import React, { useEffect } from "react";
import GameBoard, { GameBoardData } from "./GameBoard";
import FamilyFeud from "./FamilyFeud";
import Millionaire from "./Millionaire";
import { GameName, GameState } from "../types/common";
import ScoreBoard from "./Scoreboard";
import QuestionWrapper from "./QuestionWrapper";
import Minute from "./Minute";
import HeadToHead from "./HeadToHead";

interface PageWrapperProps {
  gameState: GameState;
  gameBoardData: { [key: string]: GameBoardData };
}

const PageWrapper: React.FC<PageWrapperProps> = ({
  gameState,
  gameBoardData,
}) => {
  const getComponent = (): React.ReactNode => {
    switch (gameState.currentGame.gameName) {
      case GameName.BOARD:
        return (
          <GameBoard
            gameState={gameState}
            gameBoardData={gameBoardData}
            handleUpdateCurrentGame={() => {}}
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
      case GameName.MILLIONAIRE:
        return (
          <QuestionWrapper gameState={gameState} question={<Millionaire />} />
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
      default:
        return <div>Content not available for this category.</div>;
    }
  };

  return (
    <div className="p-4">
      <div className="bg-white p-4 rounded shadow-lg">{getComponent()}</div>
      <ScoreBoard gameState={gameState} />
    </div>
  );
};

export default PageWrapper;
