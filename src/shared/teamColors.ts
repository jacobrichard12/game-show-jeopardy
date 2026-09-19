// One color per team slot, used consistently on the scoreboard, the award
// buttons and the lobby chips so a team is recognizable at a glance. Full
// literal class names (not built from strings) so Tailwind keeps them.
export interface TeamColor {
  button: string; // solid button
  chip: string; // pill / accent background
  glow: string; // "it's your turn" glow
  text: string; // colored text on dark
  border: string;
}

export const TEAM_COLORS: TeamColor[] = [
  {
    button: "bg-emerald-500 hover:bg-emerald-600",
    chip: "bg-emerald-500",
    glow: "shadow-[0_0_35px_10px_rgba(16,185,129,0.75)]",
    text: "text-emerald-300",
    border: "border-emerald-400",
  },
  {
    button: "bg-rose-500 hover:bg-rose-600",
    chip: "bg-rose-500",
    glow: "shadow-[0_0_35px_10px_rgba(244,63,94,0.75)]",
    text: "text-rose-300",
    border: "border-rose-400",
  },
  {
    button: "bg-violet-500 hover:bg-violet-600",
    chip: "bg-violet-500",
    glow: "shadow-[0_0_35px_10px_rgba(139,92,246,0.75)]",
    text: "text-violet-300",
    border: "border-violet-400",
  },
  {
    button: "bg-amber-500 hover:bg-amber-600",
    chip: "bg-amber-500",
    glow: "shadow-[0_0_35px_10px_rgba(245,158,11,0.75)]",
    text: "text-amber-300",
    border: "border-amber-400",
  },
];

export const teamColor = (index: number): TeamColor =>
  TEAM_COLORS[index % TEAM_COLORS.length];
