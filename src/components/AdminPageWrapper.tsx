import React from "react";
import { BoardPage, GameName, GameState } from "../shared/types";
import AdminPointsButtons, { NoPointsButton } from "./AddPointsButtons";
import { boardData, boardPageTabs } from "./boards";
import FamilyFeud from "./FamilyFeud";
import GameBoard from "./GameBoard";
import HeadToHead from "./HeadToHead";
import Millionaire from "./Millionaire";
import Minute from "./Minute";
import { PARTY_GAME_COMPONENTS } from "./partyGameComponents";
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

  // Switching pages also switches the TV, so the room sees the same board.
  const pageTabs = boardPageTabs(gameState);
  const currentPage: BoardPage = gameState.boardPage ?? pageTabs[0].id;
  const handleSelectBoardPage = (page: BoardPage) => {
    if (page === currentPage) return;
    sendGameStateToServer({ ...gameState, boardPage: page });
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
      default: {
        const PartyGame = PARTY_GAME_COMPONENTS[gameState.currentGame.gameName];
        return PartyGame ? (
          <PartyGame
            isAdmin={true}
            gameState={gameState}
            sendGameStateToServer={sendGameStateToServer}
          />
        ) : (
          <div>Admin child content</div>
        );
      }
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
          {/* Tabs only when the board has more than one page (Standard);
              a custom pack's board is a single page. */}
          {pageTabs.length > 1 && (
          <>
          <div
            role="group"
            aria-label="Board page"
            className="inline-flex flex-wrap justify-center gap-1 rounded-lg bg-gray-200 p-1"
          >
            {pageTabs.map((page) => (
              <button
                key={page.id}
                type="button"
                aria-pressed={currentPage === page.id}
                onClick={() => handleSelectBoardPage(page.id)}
                className={`rounded px-3 py-1.5 text-sm font-semibold sm:px-4 sm:text-base ${
                  currentPage === page.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-300"
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500">The TV shows the same page.</p>
          </>
          )}
        </div>
        <GameBoard
          isAdmin={true}
          gameState={gameState}
          gameBoardData={boardData(gameState)}
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
              className="px-6 py-3 text-lg font-semibold bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
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
        {gameState.currentGame.questionState.promptVisible && (
          <NoPointsButton
            gameState={gameState}
            handleAddPoints={handleAddPoints}
          />
        )}
      </div>
    );
  };

  return getAdminPageWrapperContent();
};

export default AdminPageWrapper;
