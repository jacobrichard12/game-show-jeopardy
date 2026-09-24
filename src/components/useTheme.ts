import { useEffect } from "react";
import { toThemeId } from "../shared/themes";

// Applies a game's theme (shared/themes.ts) to the whole page while the
// calling component is mounted, so pages outside a game (join, create) keep
// the Original look.
export function useTheme(theme: unknown): void {
  const id = toThemeId(theme);
  useEffect(() => {
    const root = document.documentElement;
    if (id === "original") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", id);
    return () => root.removeAttribute("data-theme");
  }, [id]);
}
