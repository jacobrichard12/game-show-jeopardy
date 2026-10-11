import React, { useEffect, useState } from "react";
import { gameStartAudio } from "../shared/audio";
import { DECOR_IDS, DecorId } from "../shared/decor";
import { playSound } from "../shared/sound";
import { ThemeId, THEMES } from "../shared/themes";
import { GameState } from "../shared/types";
import { newSandboxState } from "./Sandbox";
import PageWrapper from "./PageWrapper";
import StartTunnel, { BOARD_ZOOM_CLASS, TITLE_EXIT_CLASS, TUNNEL_MS } from "./StartTunnel";
import TitlePage from "./TitlePage";
import { useTheme } from "./useTheme";

const DECOR_LABELS: Record<DecorId, string> = {
  "catholic-emoji": "Catholic emoji",
  "catholic-icons": "Catholic icons (drawn)",
};

// /sandbox?title: the lobby title screen as the TV shows it, to try each
// decor (a pack's "decor") and theme, and play the Start Game tunnel into
// the board (the Standard one here).
const TitlePreview: React.FC = () => {
  const [decor, setDecor] = useState<DecorId | "">("catholic-emoji");
  const [theme, setTheme] = useState<ThemeId>("original");
  const [tunnel, setTunnel] = useState(0);
  const [onBoard, setOnBoard] = useState(false);
  const [leavingTitle, setLeavingTitle] = useState(false);
  useEffect(() => {
    if (!leavingTitle) return;
    const timer = setTimeout(() => setLeavingTitle(false), TUNNEL_MS);
    return () => clearTimeout(timer);
  }, [leavingTitle]);
  useTheme(theme);

  const gameState: GameState = {
    ...newSandboxState(2),
    titleScreen: {
      title: "Exultathon",
      subtitle: "Welcome to the Ultimate Exult Experience!",
      ...(decor ? { decor } : {}),
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-ink to-deep">
      {onBoard ? (
        // Keyed by the tunnel so each start remounts it and replays the zoom.
        <div key={tunnel} className={BOARD_ZOOM_CLASS}>
          <PageWrapper gameState={gameState} boardIntro={tunnel} />
        </div>
      ) : (
        <TitlePage isAdmin={false} code="ABCD" gameState={gameState} sendGameStateToServer={() => {}} />
      )}
      {onBoard && leavingTitle && (
        <div key={tunnel} className={TITLE_EXIT_CLASS}>
          <TitlePage isAdmin={false} code="ABCD" gameState={gameState} sendGameStateToServer={() => {}} />
        </div>
      )}
      <StartTunnel tunnelKey={tunnel} decor={decor || undefined} />

      <div className="fixed right-3 top-3 z-50 flex flex-wrap items-center gap-2 rounded-xl bg-white/90 p-2 text-sm text-gray-900 shadow">
        <label>
          Decor{" "}
          <select
            value={decor}
            onChange={(e) => setDecor(e.target.value as DecorId | "")}
            className="rounded border bg-white p-1"
          >
            <option value="">None</option>
            {DECOR_IDS.map((id) => (
              <option key={id} value={id}>
                {DECOR_LABELS[id]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Theme{" "}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as ThemeId)}
            className="rounded border bg-white p-1"
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
          onClick={() => {
            setOnBoard(true);
            setTunnel((n) => n + 1);
            setLeavingTitle(true);
            playSound(gameStartAudio);
          }}
          className="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
        >
          ▶ Start Game
        </button>
        {onBoard && (
          <button
            type="button"
            onClick={() => setOnBoard(false)}
            className="rounded bg-gray-200 px-3 py-1 text-gray-800 hover:bg-gray-300"
          >
            ↺ Back to title
          </button>
        )}
        <a href="/sandbox" className="text-blue-600 underline">
          Back to sandbox
        </a>
      </div>
    </div>
  );
};

export default TitlePreview;
