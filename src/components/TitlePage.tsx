import React from "react";
import { GameState } from "../shared/types";

interface TitlePageProps {
  isAdmin: boolean;
  gameState: GameState;
  sendGameStateToServer: (updatedGameState: GameState) => void;
}

const TitlePage: React.FC<TitlePageProps> = ({
  isAdmin,
  gameState,
  sendGameStateToServer,
}) => {
  const startGame = () => {
    if (!isAdmin) return;

    const updatedGameState = { ...gameState };
    updatedGameState.started = true;
    sendGameStateToServer(updatedGameState);
  };

  return (
    <div className="relative h-screen w-screen bg-gradient-to-br from-blue-700 via-purple-800 to-black flex items-center justify-center overflow-hidden">
      {/* Background animation */}
      <div className="absolute top-0 left-0 w-full h-full animate-pulse opacity-20">
        <div className="absolute inset-0 bg-gradient-radial from-blue-500 via-purple-500 to-transparent blur-3xl mix-blend-overlay"></div>
      </div>

      {/* Animated Title */}
      <div className="relative text-center">
        <h1 className="text-6xl md:text-8xl font-extrabold text-yellow-400 drop-shadow-md animate-gentle-bounce">
          Game Show Jeopardy
        </h1>
        <p className="text-xl md:text-2xl text-white mt-4 animate-fade-in">
          Welcome to the Ultimate Game Experience!
        </p>
      </div>

      {/* Bottom Note or Button */}
      <div className="absolute bottom-10 text-center w-full">
        {isAdmin && (
          <button
            onClick={startGame}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 px-6 rounded-lg shadow-lg transition duration-300"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
};

export default TitlePage;
