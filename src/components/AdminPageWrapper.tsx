import React from "react";
import { GameName, GameState, Team } from "../types/common";
import gameBoardData from "../data/gameBoard.json";
import GameBoard from "./GameBoard";
import FamilyFeud from "./FamilyFeud";
import Minute from "./Minute";
import HeadToHead from "./HeadToHead";
import Millionaire from "./Millionaire";
import ScoreBoard from "./Scoreboard";
import wow from "../assets/wow.mp3";
import Singing from "./Singing";

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
  const havePointsBeenAwarded = () => {
    if (gameState.isDoubleJeopardy) {
      return (
        gameState.doubleJeopardyAnswered[gameState.currentGame.gameName] &&
        gameState.doubleJeopardyAnswered[gameState.currentGame.gameName].includes(
          gameState.currentGame.value
        )
      );
    } else {
      return (
        gameState.answered[gameState.currentGame.gameName] &&
        gameState.answered[gameState.currentGame.gameName].includes(
          gameState.currentGame.value
        )
      );
    }
  };

  const handleAwardPointsClick = (team: Team, noPointsOverride: boolean) => {
    handleAddPoints(
      team,
      gameState.currentGame.value,
      gameState.currentGame.gameName,
      noPointsOverride
    );
  };

  const handleToggleDoubleJeopardy = () => {
    const updatedGameState = { ...gameState };
    if (!updatedGameState.isDoubleJeopardy) {
      const audio = new Audio(wow);
      audio.play();
    }
    updatedGameState.isDoubleJeopardy = !updatedGameState.isDoubleJeopardy;
    sendGameStateToServer(updatedGameState);
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
      case GameName.SINGING:
        return (
          <Singing
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
          <div className="flex justify-around items-center">
            <button
              onClick={() => handleAwardPointsClick(Team.TeamA, false)}
              disabled={havePointsBeenAwarded()} // Disable if points have been awarded
              className={`p-2 rounded ${
                havePointsBeenAwarded()
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }`}
            >
              Add {gameState.currentGame.value} points to{" "}
              {gameState[Team.TeamA].name}
            </button>

            <button
              onClick={() => handleAwardPointsClick(Team.TeamA, true)}
              disabled={havePointsBeenAwarded()} // Disable if points have been awarded
              className={`p-2 rounded ${
                havePointsBeenAwarded()
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              No One Gets Points
            </button>

            <button
              onClick={() => handleAwardPointsClick(Team.TeamB, false)}
              disabled={havePointsBeenAwarded()} // Disable if points have been awarded
              className={`p-2 rounded ${
                havePointsBeenAwarded()
                  ? "bg-gray-400 text-gray-700 cursor-not-allowed"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              Add {gameState.currentGame.value} points to{" "}
              {gameState[Team.TeamB].name}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {gameState.currentGame.gameName === GameName.BOARD
        ? getGameBoardAdminPage()
        : getChildAdminGamePage()}
      <ScoreBoard
        gameState={gameState}
        isAdmin={true}
        handleUpdateTurn={handleUpdateTurn}
      />
    </div>
  );
};

export default AdminPageWrapper;
