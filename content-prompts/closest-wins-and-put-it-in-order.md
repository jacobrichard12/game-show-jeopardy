# Closest Wins + Put It In Order: fact-question generator prompt

Paste everything in the box below into an AI chat that can **search the web**
(e.g. Claude with web search turned on). It asks you for themes, looks up every
number or date online, and writes questions in the exact JSON the app uses,
with a source for each fact so you can spot-check it.

Review every entry and open a few source links, then add the ones you keep to
`src/data/partyGames.json` under `"closest"` and `"order"`, and run
`CI=true npx react-scripts test --watchAll=false`.

**Why the web search matters:** AI tools often misremember exact numbers and dates. The prompt forbids answering from memory; if an entry has no source link, don't use it.

---

```text
You are writing questions for two party games played on a TV in a living room
(10–30 adults, mixed ages, 2–4 teams):

- CLOSEST WINS: every team writes down a number at the same time; the closest
  guess wins (or "closest without going over"). Best questions are ones
  people have a feel for but almost nobody knows exactly, so guesses spread
  out ("How many hot dogs did the Nathan's contest winner eat in 2024?", "How
  tall is the Statue of Liberty from base to torch, in feet?"). Avoid facts
  people have memorized (days in a year, legs on a spider). Those just produce ties.
- PUT IT IN ORDER: one team sees 4–6 shuffled items and must put them in the
  right order by some hidden value (release year, height, population,
  calories, distance…). Best sets are famous, comparable items whose order
  isn't obvious.

STEP 1 — Before writing anything, ask me:
  a) 1–3 themes (e.g. "food", "space", "sports", "the 90s", "travel",
     "animals", or "surprise me"),
  b) how many of each game per difficulty (default: 6 easy, 6 medium, 4 hard
     for each game),
  c) US or metric units (default: US, with metric only where it's the norm),
  d) any questions I already have, so you don't repeat them.
Wait for my answers.

STEP 2 — Research. For EVERY number, date, and ordering value, search the web
and use a reliable source (official sites, Wikipedia with its cited source,
government/statistics agencies, record books). Never use a number from
memory. If sources disagree by more than ~2%, or the value changes often and
has no clear "as of" date, drop the question.

DIFFICULTY BRACKETS:
- EASY: very familiar subject; a reasonable guess lands close. ORDER: 4
  items, values far apart (e.g. release years ≥10 years apart).
- MEDIUM: familiar subject, answer less intuitive. ORDER: 5 items, values
  moderately apart (≥5 years, or ≥25% apart for sizes/counts).
- HARD: surprising answer or a big number that's hard to estimate. ORDER:
  5–6 items, closer values (still ≥2 years or ≥10% apart). Never a tie.

RULES (the app enforces some of these):
- CLOSEST: "answer" is a plain number (no commas or units inside it). Round
  it to what a fair guess could hit (2–3 significant figures) and say the
  precision in the prompt if needed ("in millions", "to the nearest year").
  Put the unit in "unit" (e.g. "feet", "miles", "calories"); leave it out
  for plain counts. Set "plain": true for years (so 1969 doesn't show as
  1,969). Use "rule": "noOver" only when there's one exact, well-defined
  value; otherwise leave "rule" out (closest wins). If the value can change,
  put "as of <year>" in the prompt.
- ORDER: "items" must be in the CORRECT order, 3–10 unique short labels
  (1–4 words each; they're shown big on a TV). "prompt" names the set (e.g.
  "Famous towers"); "direction" says what first means (e.g. "shortest
  first", "oldest first", "most calories first").
- Family-friendly, no politics or tragedies. No repeats.

STEP 3 — Output ONLY this JSON in one code block:

{
  "closest": {
    "easy":   [ { "prompt": "How tall is the Statue of Liberty from base to torch, in feet?", "answer": 305, "unit": "feet" } ],
    "medium": [ { "prompt": "In what year did the first McDonald's open?", "answer": 1940, "plain": true } ],
    "hard":   [ { "prompt": "How many miles long is the Great Wall of China (all branches)?", "answer": 13000, "unit": "miles" } ]
  },
  "order": {
    "easy":   [ { "prompt": "Video game consoles", "direction": "oldest first", "items": ["Atari 2600", "Nintendo 64", "Nintendo Wii", "Nintendo Switch"] } ],
    "medium": [ ],
    "hard":   [ ]
  }
}

(The example values above only show the format. Don't copy them without
researching them.)

Then, BELOW the code block, a sources table with one row per entry:
game | prompt | value(s) used | source URL(s) | as-of date | note (anything
borderline or that sources disagreed on).
```

---

**Tips**
- For Put It In Order, the fun comes from sorting familiar things by a
  value people *think* they know: franchise movies by release, landmarks by
  height, snacks by calories, cities by population.
- Want a themed night? Answer step 1 with one theme; the defaults (6/6/4)
  fill every board tile with spares (the board needs at least 4 easy,
  4 medium, 2 hard).
