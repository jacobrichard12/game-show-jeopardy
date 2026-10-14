import React, { useRef, useState } from "react";
import { ThemeId, THEMES } from "../shared/themes";
import { GameState, MAX_TEAMS, MIN_TEAMS, SandboxPack } from "../shared/types";
import { AdminHost } from "./Admin";
import DeviceFrame, { DeviceSize, DeviceSizePicker } from "./DeviceFrame";
import { DisplayScreen } from "./Display";
import { freshFullGame } from "./sandboxContent";
import SplitPanes, { PaneView, PaneViewSwitch } from "./SplitPanes";
import { useSandboxPacks } from "./useSandboxPacks";
import { useTheme } from "./useTheme";

// /sandbox/demo: a whole game, as it really runs, with the real host page
// and TV screen (AdminHost, DisplayScreen) side by side and driven by one
// local game state. Pick a content pack, then play it through: title screen,
// Start Game, the board and its tabs, tiles, scoring, pause, end of game.
// Nothing goes to a game room. The sandbox (/sandbox) is for proofing
// individual games tile by tile.
const SandboxDemo: React.FC = () => {
  const [theme, setTheme] = useState<ThemeId>("original");
  useTheme(theme);
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  const [view, setView] = useState<PaneView>("both");
  // The host follows its panel's width (narrow = phone layout); the TV is a
  // 1080p screen.
  const [hostSize, setHostSize] = useState<DeviceSize>("actual");
  const [tvSize, setTvSize] = useState<DeviceSize>("tv");
  const [game, setGame] = useState<GameState>(() => freshFullGame(MIN_TEAMS, null, "original"));

  const settings = useRef({ teamCount, theme });
  settings.current = { teamCount, theme };
  const restart = (pack: SandboxPack | null, teams = settings.current.teamCount) =>
    setGame(freshFullGame(teams, pack, settings.current.theme));
  const { packList, pack, message, choosePack } = useSandboxPacks((loaded) => restart(loaded));

  return (
    <div className="min-h-screen bg-gray-100 p-3 text-left text-gray-900 sm:p-6">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-white px-3 py-2 text-sm shadow">
          <span className="font-bold">Game demo</span>
          {packList.length > 0 && (
            <label className="flex items-center gap-1" title="Sample questions, or one of your content packs (loaded from the server)">
              <span className="text-xs text-gray-500">Content</span>
              <select
                aria-label="Content"
                value={pack?.id ?? ""}
                onChange={(e) => choosePack(e.target.value)}
                className="rounded border px-1 py-1"
              >
                <option value="">Sample content</option>
                {packList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {message && <span className="text-xs text-gray-500">{message}</span>}
            </label>
          )}
          <label className="flex items-center gap-1" title="Number of teams (starts the game over)">
            <span className="text-xs text-gray-500">Teams</span>
            <select
              aria-label="Team count"
              value={teamCount}
              onChange={(e) => {
                const teams = Number(e.target.value);
                setTeamCount(teams);
                restart(pack, teams);
              }}
              className="rounded border px-1 py-1"
            >
              {Array.from({ length: MAX_TEAMS - MIN_TEAMS + 1 }, (_, i) => MIN_TEAMS + i).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1" title="Board colors">
            <span className="text-xs text-gray-500">Theme</span>
            <select
              aria-label="Theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemeId)}
              className="rounded border px-1 py-1"
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => restart(pack)}
            title="Start the whole game over from the title screen"
            className="rounded bg-blue-500 px-2 py-1 text-white hover:bg-blue-600"
          >
            ↺ Restart game
          </button>
          <a href="/sandbox" className="text-blue-600 underline" title="Test individual games tile by tile">
            Single games →
          </a>
          <PaneViewSwitch view={view} onChange={setView} />
        </div>
        <p className="mt-1 px-1 text-sm text-gray-600">
          <span className="font-semibold">Now:</span> {pack?.name ?? "Sample content"} · the whole game on the real
          host page and TV. Start from the title screen and play it through; nothing is sent to a game room.
        </p>
      </header>

      <SplitPanes
        view={view}
        host={
          <section className="rounded-xl bg-gray-50 p-3 text-left text-gray-900 shadow sm:p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Host panel</h2>
              <DeviceSizePicker label="Host size" value={hostSize} onChange={setHostSize} />
            </div>
            {/* The real host page; its toolbar and dialogs stay in the frame. */}
            <DeviceFrame title="Host page" size={hostSize}>
              <div className="relative min-h-[720px] bg-gray-100">
                <AdminHost
                  code="DEMO"
                  gameState={game}
                  sendGameStateToServer={setGame}
                  onReset={() => restart(pack, game.teams.length)}
                />
              </div>
            </DeviceFrame>
          </section>
        }
        tv={
          <section
            aria-label="TV display"
            className="rounded-xl bg-gradient-to-b from-ink to-deep p-2 text-white shadow sm:p-4"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-left text-sm font-semibold uppercase tracking-widest text-white/60">TV display</h2>
              <DeviceSizePicker label="TV size" value={tvSize} onChange={setTvSize} dark />
            </div>
            <DeviceFrame title="TV" size={tvSize} actualHeight="tv">
              <DisplayScreen code="DEMO" gameState={game} />
            </DeviceFrame>
          </section>
        }
      />
    </div>
  );
};

export default SandboxDemo;
