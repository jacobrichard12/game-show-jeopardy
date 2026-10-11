import { GameName, GameState } from "./types";

// Awards a tile to a team: adds `points` to their score (unless
// `noPoints`), marks the tile answered for the current round, and gives the
// team the turn. A pure, immutable version of the host panel's
// handleAddPoints (Admin.tsx), used by the /sandbox page. Admin.tsx still has
// its own in-place copy; unify them when ROADMAP R4 is done.
export function awardPoints(
  gameState: GameState,
  teamId: string,
  points: number,
  gameName: GameName,
  noPoints: boolean
): GameState {
  if (!gameState.teams.some((team) => team.id === teamId)) return gameState;

  const teams = gameState.teams.map((team) =>
    team.id === teamId && !noPoints ? { ...team, score: team.score + points } : team
  );
  // "No one gets points" isn't a win, so the turn stays where it was.
  const whoseTurn = noPoints ? gameState.whoseTurn : teamId;
  const noPointsCount = noPoints ? (gameState.noPointsCount ?? 0) + 1 : gameState.noPointsCount;

  if (gameState.isDoubleJeopardy) {
    return {
      ...gameState,
      teams,
      whoseTurn,
      noPointsCount,
      doubleJeopardyAnswered: {
        ...gameState.doubleJeopardyAnswered,
        [gameName]: [...(gameState.doubleJeopardyAnswered[gameName] ?? []), points],
      },
    };
  }
  return {
    ...gameState,
    teams,
    whoseTurn,
    noPointsCount,
    answered: {
      ...gameState.answered,
      [gameName]: [...(gameState.answered[gameName] ?? []), points],
    },
  };
}
