# Game Show Jeopardy

Party game-show app: one host laptop + one TV, deployed on Railway. React (CRA) + Express/Socket.IO, in-memory rooms, no database.

**Read in this order:**
1. `PROJECT_CONTEXT.md`: architecture, socket protocol, state shape, content formats, deploy notes, gotchas.
2. `ROADMAP.md`: owner decisions, current status, prioritized tasks, session log. **Update it before you finish a session** (tick items, record discoveries, append a log entry).

The roadmap is **feature-focused** by owner direction; reliability/hygiene items are parked in ROADMAP §6.

## Verify before and after changes
- `npx tsc --noEmit -p tsconfig.json` and `npx tsc --noEmit -p tsconfig.server.json`
- `CI=true npx react-scripts test --watchAll=false`
- Dev: `npm run server-start` (client :3000, server :4000); host at `/admin`, TV at `/watch/CODE`

## Rules
- The app is **live** on Railway with `ADMIN_TOKEN` set. Pushes to `mainline` do **not** deploy (verified). Deploys are manual (`railway up` uploads the *working tree*, uncommitted files included) and destroy in-progress games, so **never deploy without the user's explicit go-ahead**. Read-only Railway CLI commands are fine; see `PROJECT_CONTEXT.md` §9 for IDs.
- Content (new questions/videos) is the owner's job for now; don't author or restructure it unprompted.
- Keep it minimal: **no persistence layer**, no player/buzzer devices. See ROADMAP §1 before proposing features.
- Look up questions only via `getCurrentQuestion()`, never index banks directly (Double Jeopardy offset).
- Sounds play from the display tab only, by reacting to state changes; create audio with `createAudio()`.
- Server code must not use `for…of` on Map/Set (root tsconfig targets es5); use `.forEach`.
- Don't claim UI behavior works unless you ran it; mark it unverified in the roadmap.
