# Game Show Jeopardy

A party game-show app for a room full of people. The host runs the game from a laptop; a TV shows a Jeopardy-style board where every column is a different mini-game. Teams pick tiles, play the game behind them, and the host awards the points.

Built for one host and one TV, 10–30 players in 2–4 teams. There are no player devices or buzzers: everyone watches the TV and the host clicks.

## The games

The board has two pages, each tile worth 100–500 points, plus a Double Jeopardy round at double value.

| Classic Games | Party Games |
|---|---|
| **Family Feud:** guess the top survey answers | **Guess That Word:** hangman-style phrase puzzle |
| **Who Wants to Be a Millionaire:** three multiple-choice questions per tile | **Act, Draw, Describe:** charades, pictionary or clue-giving against the clock |
| **Minute to Win It:** a physical challenge, demo video on the TV | **Scavenger Sprint:** first team to bring the item wins |
| **Head to Head:** players from each team face off | **Closest Wins:** every team guesses a number; closest wins |
| | **Put It In Order:** sort 4–5 items (by year, size, …) |
| | **Reverse Charades:** the whole team acts, one person guesses |

Also: a YouTube countdown timer overlay, sound effects on the TV, team scores always on screen, a "We'll be right back" pause screen, custom content packs for an event (see *Content*), and sandbox pages for trying the games without starting a real one.

## Quick start

Requires Node.js and npm.

```bash
npm install
npm run server-start      # client on http://localhost:3000, server on :4000
```

1. Open **http://localhost:3000/host**, pick the number of teams and create a game. You get a 4-letter room code. (Leave the host token blank unless you've set `ADMIN_TOKEN`; then enter it, or a guest pass.)
2. Open **http://localhost:3000/watch/CODE** in another window or on the TV, and click once so the browser allows sound.
3. Start the game from the host window. The TV follows everything the host does.

To try the games without a room, open **http://localhost:3000/sandbox**: it shows the host controls and the TV side by side.

## Pages

| Page | For |
|---|---|
| `/` | Join screen: host a game or enter a room code |
| `/host` | Create a game with a host token: the admin token or a guest pass (when `ADMIN_TOKEN` is set) |
| `/host/CODE` | Host control panel |
| `/watch/CODE` | TV display (read-only) |
| `/sandbox` | Test bench for every game, tile by tile, with placeholder questions (always on in dev; in production only if `REACT_APP_SANDBOX=true` at build). Asks for a host token when `ADMIN_TOKEN` is set; content packs load for the admin token only |
| `/sandbox/demo` | A whole game in one window, host page and TV side by side, without a room. Same access as `/sandbox` |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_TOKEN` | unset | Password required to create a game. **Set it on any public deployment**; unset, anyone can create games. |
| `GUEST_TOKENS` | unset | Guest passes, for letting someone try the app (see below). The admin token keeps full access. |
| `PORT` | `4000` | Server port. |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed origin for the dev client (CORS). |
| `REACT_APP_SOCKET_URL` | same origin (prod), `http://localhost:4000` (dev) | Where the browser connects. Set at build time. |
| `REACT_APP_SANDBOX` | unset | `true` includes `/sandbox` in a production build. |

### Guest passes

`GUEST_TOKENS` is a list of passes separated by commas, spaces or new lines. Each pass is `token` or `token@YYYY-MM-DD`:

```
GUEST_TOKENS=acme-demo-7f3k9q@2026-12-31, friend-pass-2m8x
```

- **token:** at least 6 characters; anything except spaces, commas and `@`. Make it long enough not to be guessed.
- **@YYYY-MM-DD** (optional): the last day the pass works, through the end of that day (UTC). Without a date it never expires.
- Malformed entries are skipped, with a warning in the server log.
- Remove a pass from the list to revoke it. Changing the variable restarts the server.

The **host token** field (on `/host`, the sandbox and the reclaim prompt) takes either the admin token or a guest pass. Guests host games with the built-in questions only (no content packs, which also stay hidden from them), have up to 5 games open per pass, and can reclaim only the games they created. They can also use the sandbox pages with placeholder questions.

## Development

```bash
npx tsc --noEmit -p tsconfig.json          # type-check the client
npx tsc --noEmit -p tsconfig.server.json   # type-check the server
CI=true npx react-scripts test --watchAll=false
npm run build && npm run server-build      # production build, served at http://localhost:4000
```

The app is React (Create React App, TypeScript, Tailwind) with an Express + Socket.IO server. Game state lives in server memory, one room per game; nothing is saved, so restarting the server ends all games.

## Content

Questions live in `src/data/`:
- `feud4.csv`–`feud7.csv`: Family Feud surveys (the number is how many answers).
- `minuteBank.json`, `headToHeadBank.json`: Minute to Win It challenges (with YouTube demo links) and Head to Head matchups.
- `partyGames.json`: all six party games.
- Millionaire questions are fetched from [Open Trivia DB](https://opentdb.com) when the server starts.

Each game needs at least 4 easy, 4 medium and 2 hard entries.

**Content packs** (`src/data/custom/*.json`) give an event its own board: its questions, title screen and layout, up to 4 pages (a page can be a side game such as Reverse Charades). The host picks one on Create Game. Start from `template.json`, and run `npm run check-pack` to validate. Files starting with `_` are drafts and aren't loaded. Pack questions are sent only to games that use the pack, never to guests. `content-prompts/` has ready-made AI prompts for writing party-game content, and `scripts/` has the import tools for Feud and the word games. Third-party data licenses are in `src/data/THIRD_PARTY_NOTICES.md`.

## Deployment

Hosted on [Railway](https://railway.app). Deploys are manual (`railway up` from the repo root); pushing to GitHub does not deploy. A deploy restarts the server and ends any game in progress.

## More docs

- `PROJECT_CONTEXT.md`: architecture, socket protocol, game state, content formats, deploy details.
- `ROADMAP.md`: decisions, planned work, session log.
- `CLAUDE.md`: rules for AI coding agents working in this repo.
