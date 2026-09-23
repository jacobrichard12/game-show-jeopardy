import { isVowel, VOWELS, vowelsLocked } from "./wheelRules";

describe("isVowel", () => {
  it("treats A, E, I, O, U as vowels in either case", () => {
    VOWELS.forEach((v) => {
      expect(isVowel(v)).toBe(true);
      expect(isVowel(v.toLowerCase())).toBe(true);
    });
  });

  it("treats Y and other letters as consonants", () => {
    ["Y", "B", "T", "Z"].forEach((c) => expect(isVowel(c)).toBe(false));
  });
});

describe("vowelsLocked", () => {
  const phrase = "FINDING NEMO";

  it("is off before any letters are called", () => {
    expect(vowelsLocked(phrase, [])).toBe(false);
  });

  it("locks after a correct vowel", () => {
    expect(vowelsLocked(phrase, ["I"])).toBe(true);
    expect(vowelsLocked(phrase, ["N", "E"])).toBe(true);
  });

  it("doesn't lock after a wrong vowel", () => {
    expect(vowelsLocked(phrase, ["A"])).toBe(false);
    expect(vowelsLocked(phrase, ["N", "U"])).toBe(false);
  });

  it("unlocks once a consonant is called, hit or miss", () => {
    expect(vowelsLocked(phrase, ["I", "N"])).toBe(false);
    expect(vowelsLocked(phrase, ["I", "Z"])).toBe(false);
  });

  it("only looks at the most recent letter", () => {
    expect(vowelsLocked(phrase, ["I", "N", "O"])).toBe(true);
    expect(vowelsLocked(phrase, ["I", "A"])).toBe(false);
  });

  it("treats Y as a consonant", () => {
    expect(vowelsLocked("HAPPY BIRTHDAY", ["A", "Y"])).toBe(false);
    expect(vowelsLocked("HAPPY BIRTHDAY", ["Y"])).toBe(false);
  });

  it("matches a lowercase phrase", () => {
    expect(vowelsLocked("finding nemo", ["E"])).toBe(true);
  });

  it("is still true on a phrase finished by a vowel (the UI ignores it once solved)", () => {
    expect(vowelsLocked("NO", ["N", "O"])).toBe(true);
  });
});
