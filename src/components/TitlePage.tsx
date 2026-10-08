import React from "react";
import { teamColor } from "../shared/teamColors";
import { GameState } from "../shared/types";
import WatchLink from "./WatchLink";

interface TitlePageProps {
  isAdmin: boolean;
  // Room code, shown large so people across the room can join.
  code?: string;
  gameState: GameState;
  sendGameStateToServer: (updatedGameState: GameState) => void;
}

const TitlePage: React.FC<TitlePageProps> = ({
  isAdmin,
  code,
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
    <div className="relative min-h-screen w-full bg-gradient-to-br from-glow via-ink to-ink flex items-center justify-center overflow-hidden px-4 py-16">
      {/* Background animation */}
      <div className="absolute top-0 left-0 w-full h-full animate-pulse opacity-20">
        <div className="absolute inset-0 bg-gradient-radial from-flare via-flare2 to-transparent blur-3xl mix-blend-overlay"></div>
      </div>

      {/* Animated Title */}
      <div className="relative text-center">
        {/* A content pack can bring its own title screen (titleScreen). */}
        <h1 className="text-4xl sm:text-6xl md:text-8xl xl:text-9xl font-display font-semibold text-accent drop-shadow-md animate-gentle-bounce break-words">
          {gameState.titleScreen?.title ?? "Game Show Jeopardy"}
        </h1>
        <p className="text-lg sm:text-xl md:text-2xl xl:text-4xl text-white mt-4 animate-fade-in">
          {gameState.titleScreen?.subtitle ?? "Welcome to the Ultimate Game Experience!"}
        </p>

        {/* Lobby: everything a latecomer needs to join, readable from across
            the room, instead of a wasted welcome screen. */}
        {code && (
          <div className="mt-8 xl:mt-14">
            <p className="text-base sm:text-xl xl:text-3xl text-white/80">
              Join at {window.location.host} with code
            </p>
            <p className="font-mono font-extrabold text-white text-5xl sm:text-7xl md:text-8xl xl:text-9xl tracking-[0.25em] pl-[0.25em]">
              {code}
            </p>
            {/* Host only: the full link to copy or send to whoever runs the TV. */}
            {isAdmin && <WatchLink code={code} />}
          </div>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2 xl:gap-4">
          {gameState.teams.map((team, index) => (
            <span
              key={team.id}
              className={`rounded-full px-4 py-1 font-display font-semibold text-white text-base sm:text-xl xl:text-3xl ${
                teamColor(index).chip
              }`}
            >
              {team.name}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom Note or Button */}
      <div className="absolute bottom-6 sm:bottom-10 text-center w-full">
        {isAdmin && (
          <button
            onClick={startGame}
            className="bg-accent hover:brightness-110 text-ink font-semibold py-2 px-6 rounded-lg shadow-lg transition duration-300"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
};

export default TitlePage;
