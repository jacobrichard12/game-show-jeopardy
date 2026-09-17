# Game Show Jeopardy — Codebase Analysis

> A comprehensive analysis of what this project does, how it works, and how it can be improved.
> Generated 2026-06-10.

---

## 1. Executive Summary

This is a **single-operator party game-show application** designed to run live trivia nights. One person acts as the **host** (driving a hidden control panel at `/admin`), while a **display** (`/`) is projected onto a TV or screen for the audience and contestants.

It bundles **five distinct mini-games** behind a Jeopardy-style category board:

| Game | What it is |
|------|-----------|
| **Game Board** | The Jeopardy grid — categories × point tiers; clicking a tile launches one of the games below. Supports a "Double Jeopardy" round with doubled values. |
| **Family Feud** | Survey-style board with hidden answers, point values, reveal-one-at-a-time, and a wrong-answer "X" buzzer. |
| **Who Wants to Be a Millionaire** | Multiple-choice questions (A–D) with progressive answer reveals and correct-answer highlighting, backed by live trivia from the Open Trivia DB API. |
| **Minute to Win It** | Physical challenges presented with an embedded YouTube demo video. |
| **Head to Head** | Team-vs-team challenges with host-only setup notes and a configurable players-per-team count. |

Two teams (Team A / Team B) compete; scores and turn are tracked on a persistent **Scoreboard** shown beneath every game.

**Architecture in one sentence:** a Create-React-App frontend and a Node/Express + Socket.IO backend share one global `GameState` object — the host mutates it and broadcasts; every connected display re-renders from it.

---

## 2. How It Works

### 2.1 Topology

```
                    ┌─────────────────────────────────────┐
                    │   Node + Express + Socket.IO :4000   │
                    │   • single in-memory `gameState`     │
                    │   • loads content at startup         │
                    │   • pure relay: store + re-broadcast │
                    └──────────────┬──────────────────────┘
                                   │ Socket.IO (ws)
                ┌──────────────────┴───────────────────┐
                │                                       │
        ┌───────▼────────┐                     ┌────────▼────────┐
        │  /admin (host) │  emit gameStateUpdate│   / (display)   │
        │  mutates state │ ───────────────────► │  read-only view │
        │  emits changes │ ◄─────────────────── │  re-renders     │
        └────────────────┘   gameStateUpdate    └─────────────────┘
                              (broadcast to all)
```

The server is the single source of truth **and** a dumb relay simultaneously: it stores whatever the host sends and rebroadcasts it verbatim to all clients (including the sender). There are no rooms, sessions, or per-client state — one global game.

### 2.2 The `GameState` object

Everything flows through one serializable blob defined in `src/shared/types.ts`:

```ts
GameState {
  gameData: GameData              // ALL question content, generated at startup
  started?: boolean
  TeamA: { name, score }
  TeamB: { name, score }
  whoseTurn?: Team
  currentGame: {                  // what's on screen right now
    gameName, gameTitle, value, questionState
  }
  showTimer?: boolean
  isDoubleJeopardy: boolean
  answered:               { [gameName]: number[] }   // round-1 tiles used up
  doubleJeopardyAnswered: { [gameName]: number[] }   // round-2 tiles used up
}
```

`questionState` is a per-game polymorphic field (Feud tracks `revealedAnswers[]` + `wrongGuesses`; Millionaire tracks `questionIdx` + `revealedAnswers` count + `showCorrectAnswer`; etc.).

### 2.3 Content loading (server startup)

On boot, `src/server/datagen.ts → initGameData()` populates `gameData` by slotting questions into numeric "value" keys. The key scheme (`DIFFICULTY_MAPPING`) is:

```
easy:   [100, 101, 200, 201]
medium: [300, 301, 400, 401]
hard:   [500, 501]
```

The `x01` slot is the **Double Jeopardy** twin of the `x00` slot at the same point value. Four content pipelines feed the slots:

- **Family Feud** (`feud.ts`) — parses `feud4–7.csv` (no headers; `prompt, ans1, pts1, ans2, pts2, …`), validates rows (non-empty prompt/answers, positive points), shuffles, and assigns by answer-count → difficulty (4→easy, 5+6→medium, 7→hard). The CSV libraries are huge (700–1000+ rows) so there's never a shortage.
- **Millionaire** (`trivia.ts`) — fetches live questions from `opentdb.com`, percent-decodes them, **excludes** a configurable list of categories (`baseFilters`), shuffles answer order, records `correctAnswerIdx`. 3 sub-questions per slot.
- **Minute to Win It** (`minuteBank.json`) — shuffled and slotted.
- **Head to Head** (`headToHeadBank.json`) — shuffled and slotted.

Clients that connect before loading finishes are buffered in a `waitingClients` set and flushed once data is ready.

### 2.4 The render path

- **`src/index.tsx`** → `BrowserRouter` → `SocketProvider` → `App`.
- **`App.tsx`** holds the one `gameState`, listens for `initialGameState` (once) and `gameStateUpdate` (ongoing). Route `/` shows the display (`TitlePage` before start, else `PageWrapper`); `/admin` shows `Admin`.
- **`PageWrapper`** / **`AdminPageWrapper`** switch on `currentGame.gameName` to render the right mini-game, with the `Scoreboard` always pinned at the bottom. When `showTimer` is set, a full-screen YouTube countdown takes over.
- Each mini-game component reads its slice of `gameData` by the current `value` key, renders host controls when `isAdmin`, and calls `sendGameStateToServer(...)` on every host action.

### 2.5 Audio

`src/shared/audio.ts` centralizes sound banks (happy/sad/buzzer/ding/Feud theme/Millionaire soundtracks) and a `getRandomAudio()` helper. Sounds fire on point awards, Double-Jeopardy reveal, Feud reveals/wrong-guesses, and Millionaire answer selection. (Notably, `Millionaire.tsx` re-imports these assets locally instead of using the shared module — see §4.)

---

## 3. What's Good

- **Clean conceptual model.** One `GameState` blob + broadcast is easy to reason about and trivially keeps the projector in sync with the host. For a LAN party app, this is the right amount of architecture.
- **Strong typing at the domain layer.** `types.ts` models games, teams, and per-game question states with real interfaces and enums; `getGameTitle()` centralizes display names.
- **Typed Socket.IO contract.** `ServerToClientEvents` / `ClientToServerEvents` give the socket layer compile-time event safety.
- **Robust content validation for Feud.** `validateFeudQuestion()` defensively rejects malformed CSV rows rather than crashing.
- **Thoughtful content design.** The difficulty→slot mapping with `x00`/`x01` twins is a neat way to support two rounds from one dataset, and the oversized CSV banks guarantee variety with no repeats.
- **Polished UX touches.** Score-change bounce animation, progressive answer reveals, themed audio, and DJ multipliers all add genuine game-show feel.

---

## 4. Issues & Risks

Ordered roughly by impact. Citations are `file:line`.

### High impact

1. **Inverted early-return corrupts Millionaire content** — `trivia.ts:52–54`. The guard `if (allQuestions.length < numQuestions) return allQuestions;` returns *when there aren't enough questions*. So a sparse first API batch yields a **partial** question list, which leaves `undefined` sub-questions in slots and breaks Millionaire at runtime; conversely a full batch sleeps 5s for nothing. The condition should be `>=` (return when satisfied). *Confirmed by direct read.*

2. **Host state can silently revert (stale-prop mutation)** — `Admin.tsx`. `handleToggleTimer`, `handleUpdateCurrentGame`, `handleRevealQuestion`, and `handleBackButton` spread the **`gameState` prop** (a potentially stale snapshot) instead of the live `currentGameState`. If a `gameStateUpdate` arrives between actions, the host's change is computed off old data and overwrites newer state. `handleUpdateTurn`/`handleAddPoints` correctly use `currentGameState` — the inconsistency is the bug.

3. **No null-guard on question lookups** — `FamilyFeud.tsx:51`, `Millionaire.tsx:65`, `Minute.tsx:20`, `HeadToHead.tsx:19`. `allQuestions[value!]` (and the DJ variant `allQuestions[value!/2+1]`) returns `undefined` for any key mismatch, and the very next line dereferences it (`.answers`, `.questions`, …) → hard crash with no error boundary. Combined with bug #1, a partial trivia load takes the whole display down.

4. **Server trusts and stores any payload** — `server.ts:90–93`. `gameStateUpdate` replaces global state with zero validation. Any client on the network can emit it (there's **no admin auth**), corrupting the game for everyone. For LAN use the risk is modest, but a single malformed payload from a buggy client cascades to all displays.

### Medium impact

5. **Timer reloads its video on every render** — `Timer.tsx:18–28` *(confirmed)*. `getRandomTimerLink()` is called inline in JSX, so any parent re-render re-randomizes the iframe `src` and restarts the countdown video. Pick the link once via `useState(() => …)`.

6. **Startup blocks on an external API with no fallback/timeout** — `trivia.ts:44–63`. If `opentdb.com` is slow, rate-limited, or down, the server hangs or serves empty Millionaire data. No retry backoff, cache, or bundled fallback.

7. **Broken production build script** — `package.json:35`. `server-build` runs `node dist/server.js`, but with `rootDir:"."` the output lands at `dist/src/server/server.js`. The production server path never resolves.

8. **CWD-relative content paths** — `feud.ts:13–16` read `./src/data/feud4.csv` relative to process CWD; only works when launched from repo root.

9. **Concurrent `resetGameState` race** — `server.ts:97`. Two simultaneous resets run `initGameData()` twice with no mutex; last writer wins unpredictably.

10. **Display permanently stuck on failure** — `App.tsx` `loading` clears only on `initialGameState`; if the server is down there's no timeout, retry, or message. `SocketContext.tsx` has no `disconnect`/`connect_error` handling, so a dropped server shows stale state silently.

### Low impact / hygiene

11. **Hardcoded socket URL** — `SocketContext.tsx:5` `http://localhost:4000` with no `process.env` fallback; the CORS allow-list (`server.ts`) hardcodes `localhost:3000`. Neither works off-localhost without a code edit.
12. **Duplicated audio + DJ-lookup logic.** `Millionaire.tsx:1–35` re-imports assets and redefines `getRandomFile` already in `audio.ts`; the 3-line DJ lookup is copy-pasted across four game components.
13. **Dead code / data.** `headToHead.json` is never imported (superseded by `headToHeadBank.json`); `Difficulty`/`Question`/`EmptyQuestionState` types unused; stray imports (`Timer` in `Minute.tsx:8`, `gameData` in `QuestionWrapper.tsx:3`, `all` from axis in `trivia.ts:1`).
14. **Unused / wrong dependencies.** `readline` and `ws` are in `dependencies` but never imported; `@types/socket.io@3` conflicts with socket.io v4's bundled types.
15. **Broken default test.** `App.test.tsx` still asserts the CRA "learn react" placeholder; `npm test` fails.
16. **Type-safety soft spots.** `questionState as XQuestionState` casts (no discriminant), `category.gameName as GameName`, redundant `value!` non-null assertions, `declare var YT: any`.
17. **Accessibility gaps.** Feud answers are clickable `<li>` not `<button>` (`FamilyFeud.tsx:129`); inputs lack `htmlFor`/`id` pairing (`SettingsModal.tsx`); iframes lack `sandbox`; fixed `800×600` iframes don't scale to projectors.
18. **Whole-tree re-render.** Each `gameStateUpdate` replaces the entire object; no `React.memo`/`useMemo`/selectors, so every event re-renders everything (incl. re-sending all `gameData` on the wire each time).
19. **Misc.** Prop-name typo `handleBackButon`; YouTube URL parsing (`link.split("v=")[1]`) breaks on `youtu.be` links → `embed/undefined`; `getGameTitle` has no `TIMER` case.

---

## 5. Recommended Improvements (Non-Breaking)

These preserve current behavior while raising robustness and reducing friction. Grouped by effort.

### Quick wins (hours)

- **Fix the trivia inverted condition** (`trivia.ts:52`) — change to `>= numQuestions`. Single highest-value one-line fix.
- **Guard question lookups** — a shared `getQuestionData(gameState, bank)` helper that resolves the DJ key once and returns a safe default / triggers an error boundary instead of crashing. Removes 4 copies of the logic.
- **Stabilize the Timer link** — `const [videoId] = useState(() => getRandomTimerLink())`.
- **Make the host state consistent** — drive all handlers from `currentGameState` (or drop the duplicate and use the single `gameState` prop everywhere).
- **Externalize config** — `process.env.REACT_APP_SOCKET_URL` and a `CORS_ORIGIN` env var; lets the app run on a real LAN IP without code edits.
- **Delete dead weight** — remove `headToHead.json`, unused types/imports, and the `readline`/`ws`/`@types/socket.io` deps; fix or replace `App.test.tsx`.
- **De-dup audio** — import the shared banks/helper in `Millionaire.tsx`.

### Reliability (half-day each)

- **Trivia cache + fallback** — write the API response to disk; on boot, use a fresh cache (or a bundled fallback JSON) and skip the network. Removes the startup dependency and the partial-data failure mode entirely.
- **State persistence** — snapshot `gameState` to a JSON file after each update; reload on restart unless `--reset` is passed. Survives crashes mid-game (scores/board intact). Pairs well with a reset mutex.
- **Socket resilience** — add `disconnect`/`connect_error` handling in `SocketContext`, surface a "Reconnecting…" banner, and give `App`'s loading state a timeout + retry. No more frozen projector.
- **Payload validation** — validate incoming `gameStateUpdate` with a schema (e.g. Zod) before storing, so one bad client can't corrupt everyone.
- **Separate server tsconfig** — `tsconfig.server.json` (`target: es2020`, `rootDir: src/server`, `outDir: dist`) fixes the build path bug and lets the server use modern Node features.

### Polish (incremental)

- **Discriminated `CurrentGame` union** keyed by `gameName` — kills every `as XQuestionState` cast and makes adding a game type-safe.
- **Responsive iframes** (`aspect-video`, `width="100%"`) and `<button>`/`<label htmlFor>` for a11y and projector scaling.
- **Render perf** — memoize game components and/or split `gameData` (static) out of the broadcast payload so only volatile state travels each tick.
- **Tests** — unit-test `shuffleArray`, `validateFeudQuestion`, CSV parsing, and the slot arithmetic (would have caught bug #1); a socket integration test for the relay.

---

## 6. New Feature Ideas (Additive — Don't Touch Existing Flow)

Each can be layered on without altering the core mutate-and-broadcast loop.

1. **Buzzer / lockout mode.** A lightweight `/buzzer` route on phones; first device to tap fires a `buzz` socket event, the host sees who's in, and a lockout prevents double-answers. Pure additive socket event + a new read-only display widget.

2. **Lifelines for Millionaire.** 50/50, ask-the-audience, phone-a-friend as host-toggled `questionState` flags. The data (4 answers + correct index) already supports 50/50 trivially.

3. **Content authoring UI.** A small `/editor` page (or a CLI) to add Feud/Minute/Head-to-Head entries and preview boards, replacing hand-edited CSV/JSON. Document the bank-file format while you're there.

4. **Configurable board.** Surface category selection, number of tiers, and point scaling in `SettingsModal` so each event can be themed without code changes (the board is already JSON-driven).

5. **Game history / replay log.** Append each `gameStateUpdate` to a log; enables an "undo last action" button for the host (huge quality-of-life during live play) and a post-game recap.

6. **Sound/volume controls + mute** in the host panel — live events vary wildly in audio setup; a master volume and per-cue mute would be welcome.

7. **Third-team / free-for-all support.** Generalize `TeamA`/`TeamB` into a `teams[]` array (behind a feature flag so the two-team default is untouched) for larger parties.

8. **Spectator scoreboard QR.** A read-only `/scores` page (QR on the projector) so the audience can follow along on phones — trivial given state is already broadcast.

9. **Round timer with audible warning** integrated into games (not just the standalone YouTube timer) — e.g., a 30s answer clock with a final-10s beep.

10. **Theming.** Tailwind already drives styling; a theme switch (classic Jeopardy blue, neon, holiday) is low-risk and high-delight for repeat hosts.

---

## 7. File Map (orientation)

```
src/
  index.tsx / App.tsx ............ bootstrap, routing, top-level state + socket listeners
  components/
    SocketContext.tsx ............ Socket.IO client provider
    Admin.tsx .................... HOST control panel (mutations live here)
    AdminPageWrapper.tsx ......... host-side game switch + points buttons + DJ toggle
    PageWrapper.tsx .............. display-side game switch
    GameBoard.tsx ................ Jeopardy grid (board)
    FamilyFeud / Millionaire / Minute / HeadToHead .. the four mini-games
    Scoreboard.tsx ............... team scores + turn (always visible)
    SettingsModal.tsx ........... edit team names/scores, reset
    Timer.tsx / QuestionWrapper.tsx / TitlePage.tsx / AddPointsButtons.tsx
  shared/
    types.ts ..................... GameState + all domain types (source of truth)
    audio.ts ..................... sound banks + getRandomAudio()
  server/
    server.ts .................... Express + Socket.IO; global gameState relay
    datagen.ts ................... orchestrates content loading into value-slots
    feud.ts ...................... CSV → Feud questions (+ validation)
    trivia.ts .................... OpenTDB → Millionaire questions
  data/
    gameBoard.json ............... board display config (categories/points)
    *Bank.json ................... live content banks (minute, headToHead)
    feud4–7.csv .................. Feud answer libraries by answer-count
    headToHead.json .............. DEAD (unused, superseded by headToHeadBank.json)
```
```
```
