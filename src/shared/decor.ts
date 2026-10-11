// Title-screen decorations a content pack can ask for with "decor" (the
// lobby's floating symbols, also used by that game's start burst). The
// glyphs themselves live in components/decorItems.tsx; no React here, the
// server imports this to validate packs.

export type DecorId = "catholic-emoji" | "catholic-icons";

export const DECOR_IDS: DecorId[] = ["catholic-emoji", "catholic-icons"];

export function isDecorId(value: unknown): value is DecorId {
  return DECOR_IDS.includes(value as DecorId);
}
