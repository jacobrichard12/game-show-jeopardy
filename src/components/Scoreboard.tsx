import { GameState, Team } from "../types/common";


interface ScoreBoardProps {
    gameState: GameState;
  }

const ScoreBoard: React.FC<ScoreBoardProps> = ({gameState}) => {
    return (
        <div className="flex justify-around items-center">
        <div className="p-4 border rounded-lg shadow-md bg-white w-1/4 text-center">
          <h3 className="text-lg font-bold mb-2">{gameState[Team.TeamA].name}</h3>
          <p className="text-2xl font-semibold">{gameState[Team.TeamA].score}</p>
        </div>
        <div className="p-4 border rounded-lg shadow-md bg-white w-1/4 text-center">
          <h3 className="text-lg font-bold mb-2">{gameState[Team.TeamB].name}</h3>
          <p className="text-2xl font-semibold">{gameState[Team.TeamB].score}</p>
        </div>
      </div>
    );
  };
  
  export default ScoreBoard;