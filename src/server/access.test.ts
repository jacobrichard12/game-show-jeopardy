import { accessFor, parseGuestTokens } from "./access";

const NOW = Date.UTC(2026, 9, 27, 12); // 2026-10-27 noon UTC

describe("parseGuestTokens", () => {
  it("reads passes with and without a last day", () => {
    const { passes, errors } = parseGuestTokens(" acme-demo@2026-12-31,\nfriend-pass ");
    expect(errors).toEqual([]);
    expect(passes).toEqual([
      { token: "acme-demo", expiresAt: Date.UTC(2027, 0, 1) },
      { token: "friend-pass", expiresAt: null },
    ]);
  });

  it("skips short passes and bad dates", () => {
    const { passes, errors } = parseGuestTokens("abc, good-pass@2026-13-40x, ok-pass@tomorrow");
    expect(passes).toEqual([]);
    expect(errors).toHaveLength(3);
  });

  it("is empty when unset", () => {
    expect(parseGuestTokens(undefined)).toEqual({ passes: [], errors: [] });
  });
});

describe("accessFor", () => {
  const { passes } = parseGuestTokens("acme-demo@2026-10-27, old-pass@2026-10-26, forever-pass");

  it("gives the admin token full access, alongside guest passes", () => {
    expect(accessFor("secret", "secret", passes, NOW)).toBe("admin");
  });

  it("gives a guest pass guest access through its last day", () => {
    expect(accessFor("acme-demo", "secret", passes, NOW)).toBe("guest");
    expect(accessFor("forever-pass", "secret", passes, NOW)).toBe("guest");
    expect(accessFor("acme-demo", "secret", passes, Date.UTC(2026, 9, 28))).toBeNull();
    expect(accessFor("old-pass", "secret", passes, NOW)).toBeNull();
  });

  it("refuses anything else", () => {
    expect(accessFor("nope", "secret", passes, NOW)).toBeNull();
    expect(accessFor("", "secret", passes, NOW)).toBeNull();
    expect(accessFor(undefined, "secret", passes, NOW)).toBeNull();
  });

  it("lets everyone in as admin when no admin token is set (local dev)", () => {
    expect(accessFor(undefined, undefined, [], NOW)).toBe("admin");
  });
});
