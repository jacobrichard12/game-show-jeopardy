// Who may host. Two tiers:
//  - admin: the venue's ADMIN_TOKEN (or anyone, when none is set, as in local
//    dev). Everything: content packs, the sandbox's packs, reclaiming any game.
//  - guest: a pass from GUEST_TOKENS, for letting someone try the app (e.g. a
//    demo for a job application). Hosts games with the built-in questions
//    only: no content packs (their questions stay private), reclaims only the
//    games it created, and a few games at a time.
// Guest passes are set in Railway, never committed:
//   GUEST_TOKENS="acme-demo@2026-12-31, friend-pass"
// separated by commas, spaces or newlines; "@YYYY-MM-DD" is the last day the
// pass works (through the end of that day, UTC); no date = no expiry.

export type Access = "admin" | "guest";

export const GUEST_MAX_ROOMS = 5;

export interface GuestPass {
  token: string;
  // First moment the pass no longer works (ms since epoch), or null.
  expiresAt: number | null;
}

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// Parses GUEST_TOKENS. Malformed entries are reported, not used.
export function parseGuestTokens(raw: string | undefined): { passes: GuestPass[]; errors: string[] } {
  const passes: GuestPass[] = [];
  const errors: string[] = [];
  (raw ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .forEach((entry) => {
      const at = entry.lastIndexOf("@");
      const token = at >= 0 ? entry.slice(0, at) : entry;
      const date = at >= 0 ? entry.slice(at + 1) : "";
      if (token.length < 6) {
        errors.push("a guest pass is shorter than 6 characters");
        return;
      }
      if (!date) {
        passes.push({ token, expiresAt: null });
        return;
      }
      const match = DATE.exec(date);
      const end = match ? Date.UTC(+match[1], +match[2] - 1, +match[3] + 1) : NaN;
      if (!match || Number.isNaN(end)) {
        errors.push(`a guest pass has a bad date "${date}" (use YYYY-MM-DD)`);
        return;
      }
      passes.push({ token, expiresAt: end });
    });
  return { passes, errors };
}

// What a token grants right now, or null.
export function accessFor(
  token: unknown,
  adminToken: string | undefined,
  passes: GuestPass[],
  now: number
): Access | null {
  if (!adminToken) return "admin";
  if (typeof token !== "string" || !token) return null;
  if (token === adminToken) return "admin";
  const pass = passes.find((p) => p.token === token);
  if (pass && (pass.expiresAt === null || now < pass.expiresAt)) return "guest";
  return null;
}
