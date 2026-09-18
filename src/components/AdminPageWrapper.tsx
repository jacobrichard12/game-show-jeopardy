import React from "react";
import gameBoardData from "../data/gameBoard.json";
import { GameName, GameState, Team } from "../shared/types";
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
  handleUpdateCurrentGame: (newGame: GameName, points: number) => void;
  handleAddPoints: (
    team: Team,
    points: number,
    gameName: GameName,
    noPointsOverride: boolean
  ) => void;
  handleRevealQuestion: () => void;
  handleBackButon: () => void;
  sendGameStateToServer: (gameState: GameState) => void;
  handleUpdateTurn: (team: Team) => void;
}

const AdminPageWrapper: React.FC<AdminPageWrapperProps> = ({
  gameState,
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

        <div className="absolute top-4 left-4">
          <button
            onClick={handleToggleDoubleJeopardy}
            className={`p-2 rounded ${
              gameState.isDoubleJeopardy ? "bg-red-600" : "bg-yellow-500"
            } text-white`}
          >
            {gameState.isDoubleJeopardy
              ? "Double Jeopardy: ON"
              : "Double Jeopardy: OFF"}
          </button>
        </div>
        <div className="text-center mb-4">
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
        <div className="text-center mb-4">
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
