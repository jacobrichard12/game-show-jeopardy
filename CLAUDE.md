# Game Show Jeopardy

Party game-show app: one host laptop + one TV, deployed on Railway. React (CRA) + Express/Socket.IO, in-memory rooms, no database.

**Docs (each fact lives in one place):**
- `PROJECT_CONTEXT.md`: how it works: architecture, socket protocol, state shape, content formats, deploy mechanics, gotchas.
- `ROADMAP.md`: owner decisions, what to build next, parked items, session log. **Update it before you finish a session** (tick items, record discoveries, append a short log entry).
- `README.md`: human-facing overview and quick start.

## Commands
- Type-check: `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p tsconfig.server.json`
- Tests: `CI=true npx react-scripts test --watchAll=false`
- Dev: `npm run server-start` (client :3000, server :4000); host at `/admin`, TV at `/watch/CODE`, test bench at `/sandbox`

Run the type-checks and tests before and after changes; if they're red on arrival, say so.

## Rules
- The app is **live** on Railway with `ADMIN_TOKEN` set. Pushes to `mainline` do **not** deploy. Deploys are manual (`railway up` uploads the *working tree*, uncommitted files included) and destroy in-progress games, so **never deploy without the user's explicit go-ahead, each time**. Read-only Railway CLI commands are fine (`PROJECT_CONTEXT.md` §9).
- Content (questions, videos, word lists) is the owner's job; don't author or restructure it unprompted.
- Keep it minimal: **no persistence layer**, no player/buzzer devices. Check ROADMAP §1 (decisions, dropped features) before proposing anything.
- Look up questions only via `getCurrentQuestion()`, never index banks directly (Double Jeopardy offset).
- Sounds play from the display tab only, by reacting to state changes; create audio with `createAudio()`.
- Server code must not use `for…of` on Map/Set (root tsconfig targets es5); use `.forEach`.
- Don't claim UI behavior works unless you ran it; mark it **(unverified)** in the roadmap.
