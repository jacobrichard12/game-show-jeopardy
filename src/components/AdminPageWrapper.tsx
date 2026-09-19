import React from "react";
import gameBoardData from "../data/gameBoard.json";
import { GameName, GameState } from "../shared/types";
import AdminPointsButtons from "./AddPointsButtons";
import FamilyFeud from "./FamilyFeud";
import GameBoard from "./GameBoard";
import HeadToHead from "./HeadToHead";
import Millionaire from "./Millionaire";
import Minute from "./Minute";
import ScoreBoard from "./Scoreboard";
import TitlePage from "./TitlePage";

interface AdminPageWrapperProps {
  gameState: GameState;
  code?: string;
  handleUpdateCurrentGame: (newGame: GameName, points: number) => void;
  handleAddPoints: (
    teamId: string,
    points: number,
    gameName: GameName,
    noPointsOverride: boolean
  ) => void;
  handleRevealQuestion: () => void;
  handleBackButon: () => void;
  sendGameStateToServer: (gameState: GameState) => void;
  handleUpdateTurn: (teamId: string) => void;
}

const AdminPageWrapper: React.FC<AdminPageWrapperProps> = ({
  gameState,
  code,
  handleUpdateCurrentGame,
  handleAddPoints,
  handleRevealQuestion,
  handleBackButon,
  sendGameStateToServer,
  handleUpdateTurn,
}) => {
  const handleToggleDoubleJeopardy = () => {
    const updatedGameState = { ...gameState };
    // The "wow" sound plays from GameBoard's own effect on the display side
    // instead of here, so it comes from the watch tab, not this admin tab.
    updatedGameState.isDoubleJeopardy = !updatedGameState.isDoubleJeopardy;
    sendGameStateToServer(updatedGameState);
  };

  const getAdminPageWrapperContent = () => {
    if (!gameState.started) {
      return (
        <TitlePage
          isAdmin={true}
          code={code}
          gameState={gameState}
          sendGameStateToServer={sendGameStateToServer}
        />
      );
    }

    if (
      gameState.currentGame.gameName === GameName.BOARD ||
      gameState.currentGame.gameName === GameName.TIMER
    ) {
      return getGameBoardAdminPage();
    } else {
      return getChildAdminGamePage();
    }
  };

  const getGameAdminComponent = () => {
    switch (gameState.currentGame.gameName) {
      case GameName.FAMILY_FEUD:
        return (
          <FamilyFeud
            isAdmin={true}
            gameState={gameState}
            sendGameStateToServer={sendGameStateToServer}
          />
        );
      case GameName.MINUTE:
        return (
          <Minute
            isAdmin={true}
            gameState={gameState}
            sendGameStateToServer={sendGameStateToServer}
          />
        );
      case GameName.HEAD_TO_HEAD:
        return (
          <HeadToHead
            isAdmin={true}
            gameState={gameState}
            sendGameStateToServer={sendGameStateToServer}
          />
        );
      case GameName.MILLIONAIRE:
        return (
          <Millionaire
            isAdmin={true}
            gameState={gameState}
            sendGameStateToServer={sendGameStateToServer}
          />
        );
      default:
        return <div>Admin child content</div>;
    }
  };

  const getGameBoardAdminPage = () => {
    return (
      <div className="p-4">
        {/* Title Section */}

        <div className="absolute top-2 left-2 sm:top-4 sm:left-4 flex flex-wrap items-center gap-1 sm:gap-2 max-w-[160px] sm:max-w-none">
          <button
            onClick={handleToggleDoubleJeopardy}
            className={`p-1.5 sm:p-2 text-xs sm:text-base rounded ${
              gameState.isDoubleJeopardy ? "bg-red-600" : "bg-yellow-500"
            } text-white`}
          >
            {gameState.isDoubleJeopardy
              ? "Double Jeopardy: ON"
              : "Double Jeopardy: OFF"}
          </button>
          {code && (
            <div className="p-1.5 sm:p-2 text-xs sm:text-base bg-white border rounded font-mono font-bold tracking-widest">
              {code}
            </div>
          )}
        </div>
        {/* pt-16 clears the corner boxes above (the Double Jeopardy/code
            group and Admin's fixed toolbar), which can each wrap to a
            couple of lines on narrow screens; not needed once they fit in
            one row alongside this title at sm: and up. */}
        <div className="text-center mb-4 pt-16 sm:pt-0">
          <h1 className="text-2xl font-bold mb-2">Admin Page - Board</h1>
        </div>
        <GameBoard
          isAdmin={true}
          gameState={gameState}
          gameBoardData={gameBoardData}
          handleUpdateCurrentGame={handleUpdateCurrentGame}
          sendGameStateToServer={sendGameStateToServer}
        />
        <ScoreBoard
          gameState={gameState}
          isAdmin={true}
          handleUpdateTurn={handleUpdateTurn}
        />
      </div>
    );
  };

  const getChildAdminGamePage = () => {
    return (
      <div className="p-4">
        {/* Title Section */}
        {/* pt-16 clears Admin's fixed toolbar above, which can wrap to a
            couple of lines on narrow screens; not needed once it fits in
            one row at sm: and up. */}
        <div className="text-center mb-4 pt-16 sm:pt-0">
          <h1 className="text-2xl font-bold mb-2">
            Admin Page - {gameState.currentGame.gameName} -{" "}
            {gameState.currentGame.value}
          </h1>
          {!gameState.currentGame.questionState.promptVisible && (
            <button
              onClick={handleRevealQuestion}
              className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Next
            </button>
          )}
        </div>

        <button
          onClick={() => handleBackButon()}
          className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back To Board
        </button>

        {/* Content Section */}
        {gameState.currentGame.questionState.promptVisible && (
          <div className="bg-white p-4 rounded shadow-lg">
            {getGameAdminComponent()}
          </div>
        )}

        {/* Add Points Buttons */}
        {gameState.currentGame.questionState.promptVisible && (
          <AdminPointsButtons
            gameState={gameState}
            handleAddPoints={handleAddPoints}
          ></AdminPointsButtons>
        )}
        <ScoreBoard
          gameState={gameState}
          isAdmin={true}
          handleUpdateTurn={handleUpdateTurn}
        />
      </div>
    );
  };

  return getAdminPageWrapperContent();
};

export default AdminPageWrapper;
