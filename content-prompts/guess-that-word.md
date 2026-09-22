# Guess That Word: puzzle generator prompt

Paste everything in the box below into Claude (or another AI chat). It asks you for
themes first, then writes puzzles in the exact JSON the app uses. Review every
puzzle, then add the ones you keep to `src/data/partyGames.json` under `"wheel"`
and run `CI=true npx react-scripts test --watchAll=false` (the tests check the
format and that every difficulty has enough puzzles).

On the TV, the **category** is the clue the room sees above the letter board.

---

```text
You are writing puzzles for "Guess That Word", a Wheel of Fortune–style game
played at a living-room party (10–30 adults, mixed ages, split into 2–4 teams).
The TV shows a category (the clue) and blank letter tiles; teams take turns
calling letters until someone solves it.

STEP 1 — Before writing anything, ask me:
  a) 1–3 general themes for tonight (e.g. "80s nostalgia", "food", "travel",
     "holidays", "our friend group", or "surprise me"),
  b) how many puzzles per difficulty (default: 8 easy, 8 medium, 5 hard),
  c) any puzzles I already have, so you don't repeat them (I may paste a list).
Wait for my answers.

STEP 2 — Write the puzzles. Spread them across the themes, and turn each theme
into several varied categories. Good categories (use real Wheel of Fortune
style): Phrase, Thing, Things, Place, Food & Drink, Event, Occupation,
What Are You Doing?, Before & After (two phrases sharing a middle word,
e.g. "PEANUT BUTTER CUP OF COFFEE"), Rhyme Time, Same Letter (every word
starts with the same letter), Fun & Games, Around the House, Classic TV,
Song Lyrics, Landmark, Title. Keep the category short (1–4 words) and make it
a fair clue: it should narrow the answer without giving it away.

DIFFICULTY BRACKETS (follow these strictly):
- EASY: 2–3 words, 8–18 letters. Very common phrase or thing almost every
  adult knows instantly once a few letters show ("PIECE OF CAKE"). Common
  letters (R S T L N E and vowels). Straightforward categories.
- MEDIUM: 3–4 words, 14–24 letters. Well-known but needs more letters
  ("ONCE IN A BLUE MOON"). Can include a less common letter (B, G, K, V, W, Y)
  or a trickier category like Before & After or Rhyme Time.
- HARD: 3–6 words, 18–30 letters. Still something most adults would
  recognize when solved (never obscure trivia), but hard to see early: rarer
  letters (J, Q, X, Z), fewer vowels, Before & After / Same Letter
  categories, or longer phrases.

RULES:
- Everything must be family-friendly for a mixed adult crowd; no politics,
  tragedies, or inside jokes unless I gave them to you.
- The phrase must be UPPERCASE and use only A–Z, spaces, apostrophes ('),
  hyphens (-) and ampersands (&). No numbers or other punctuation.
- No repeats of each other or of anything I listed. Vary word counts and
  categories; don't lean on "Phrase" for more than a third of any bracket.
- Double-check spelling; a misspelled puzzle can't be solved.

STEP 3 — Output ONLY this JSON (no commentary inside the code block), then
under it a short list of any puzzles you think are borderline and why:

{
  "wheel": {
    "easy":   [ { "category": "Food & Drink", "phrase": "PEANUT BUTTER AND JELLY" } ],
    "medium": [ { "category": "Phrase", "phrase": "ONCE IN A BLUE MOON" } ],
    "hard":   [ { "category": "Before & After", "phrase": "CHOCOLATE CHIP COOKIE MONSTER" } ]
  }
}
```

---

**Tips**
- Want a themed night? Answer step 1 with one theme and ask for 8/8/5. That fills every
  board tile with spares (the board needs at least 4 easy, 4 medium, 2 hard).
- The more puzzles each difficulty has, the more the game varies between nights.
  The app picks at random from each difficulty.
