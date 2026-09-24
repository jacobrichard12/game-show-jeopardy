import { TeamState } from "./types";

export interface Standing {
  team: TeamState;
  // Position in gameState.teams, which picks the team's color.
  index: number;
  // 1-based; tied scores share a rank ("1, 1, 3").
  rank: number;
}

// Final standings, highest score first. Teams with equal scores keep their
// board order and share a rank.
export function rankTeams(teams: TeamState[]): Standing[] {
  const sorted = teams
    .map((team, index) => ({ team, index }))
    .sort((a, b) => b.team.score - a.team.score || a.index - b.index);
  return sorted.map((entry) => ({
    ...entry,
    rank: sorted.findIndex((e) => e.team.score === entry.team.score) + 1,
  }));
}

// Everyone sharing the top score (more than one = a tie).
export function getWinners(teams: TeamState[]): Standing[] {
  return rankTeams(teams).filter((s) => s.rank === 1);
}
