import { phraseHasLetter } from "./partyGames";

// ---- Guess That Word: no two vowels in a row --------------------------------
//
// After a correct vowel, the remaining vowels are locked until the next
// consonant is called. A wrong vowel passes the turn and doesn't lock anything.
// Derived from the ordered guessedLetters list, so no extra state is stored.

// Y counts as a consonant.
export const VOWELS: readonly string[] = ["A", "E", "I", "O", "U"];

export function isVowel(letter: string): boolean {
  return VOWELS.includes(letter.toUpperCase());
}

// True when the most recently guessed letter is a vowel that's in the phrase.
export function vowelsLocked(phrase: string, guessedLetters: readonly string[]): boolean {
  const last = guessedLetters[guessedLetters.length - 1];
  return !!last && isVowel(last) && phraseHasLetter(phrase, last);
}
