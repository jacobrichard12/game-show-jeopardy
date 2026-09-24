// Board themes, chosen when a game is created (ROADMAP T2). Colors live in
// index.css as CSS variables under [data-theme="…"]; this is the list the
// create-game picker shows. Original = no attribute (the app's own look).
// No React here: the server imports this to validate the theme sent with
// createGame (the page hook is components/useTheme.ts).

export type ThemeId = "original" | "classic" | "neon" | "holiday";

export interface ThemeInfo {
  id: ThemeId;
  label: string;
  // Tile and number colors for the picker's swatch (match index.css).
  swatch: { tile: string; accent: string; ink: string };
}

export const THEMES: ThemeInfo[] = [
  { id: "original", label: "Original", swatch: { tile: "#2c2660", accent: "#67e8f9", ink: "#120e26" } },
  { id: "classic", label: "Classic", swatch: { tile: "#060ce9", accent: "#ffcc00", ink: "#000a4d" } },
  { id: "neon", label: "Neon", swatch: { tile: "#2b0a57", accent: "#39ff14", ink: "#07020f" } },
  { id: "holiday", label: "Holiday", swatch: { tile: "#991b1b", accent: "#fcd34d", ink: "#0b1f14" } },
];

// Anything unknown (old states, bad input over the socket) is Original.
export function toThemeId(value: unknown): ThemeId {
  return THEMES.some((t) => t.id === value) ? (value as ThemeId) : "original";
}
