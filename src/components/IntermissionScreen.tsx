import React, { useEffect, useState } from "react";
import { rankTeams } from "../shared/standings";
import { teamColor } from "../shared/teamColors";
import { GameState } from "../shared/types";
import TitleDecor from "./TitleDecor";

export const PAUSE_MESSAGE_MAX_LENGTH = 120;
export const DEFAULT_PAUSE_MESSAGE = "The game picks up again later. See you soon!";

interface IntermissionScreenProps {
  gameState: GameState;
  isAdmin: boolean;
  // Room code, so anyone joining during the break knows where to go.
  code?: string;
  // Host only.
  onResume?: () => void;
  onMessageChange?: (message: string) => void;
}

// "We'll be right back": the host pauses mid-game (GameState.paused), e.g. to
// split a game between a morning and an evening session. The TV shows the
// standings so far and the host's message; the game resumes exactly where it
// left off. The room stays alive in between (server/roomSweep.ts), as long
// as nobody redeploys the server.
const IntermissionScreen: React.FC<IntermissionScreenProps> = ({
  gameState,
  isAdmin,
  code,
  onResume,
  onMessageChange,
}) => {
  const message = gameState.pauseMessage?.trim() || DEFAULT_PAUSE_MESSAGE;
  // The host edits a local draft and sends it on blur / Enter, so the TV
  // isn't updated on every keystroke.
  const [draft, setDraft] = useState(gameState.pauseMessage ?? "");
  useEffect(() => setDraft(gameState.pauseMessage ?? ""), [gameState.pauseMessage]);
  const saveDraft = () => {
    if (draft.trim() !== (gameState.pauseMessage ?? "").trim()) onMessageChange?.(draft.trim());
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden px-4 py-16 text-center text-white">
      <TitleDecor decor={gameState.titleScreen?.decor} />

      <div className="relative">
        {gameState.titleScreen?.title && (
          <p className="font-display text-xl text-white/70 sm:text-2xl xl:text-4xl">
            {gameState.titleScreen.title}
          </p>
        )}
        <h1 className="mt-2 font-display text-5xl font-semibold text-accent drop-shadow-md motion-safe:animate-gentle-bounce sm:text-7xl xl:text-9xl">
          We'll be right back!
        </h1>
        <p className="mx-auto mt-4 max-w-4xl text-lg sm:text-2xl xl:text-4xl">{message}</p>

        <div className="mt-10 xl:mt-16">
          <p className="mb-3 text-base uppercase tracking-widest text-white/60 sm:text-lg xl:text-2xl">
            Standings so far
          </p>
          <div className="flex flex-wrap justify-center gap-3 xl:gap-6">
            {rankTeams(gameState.teams).map(({ team, index, rank }) => (
              <div
                key={team.id}
                className={`rounded-2xl px-5 py-3 font-display font-semibold shadow-lg xl:px-8 xl:py-5 ${teamColor(index).chip}`}
              >
                <span className="block text-sm opacity-80 sm:text-base xl:text-2xl">#{rank}</span>
                <span className="block text-xl sm:text-3xl xl:text-5xl">{team.name}</span>
                <span className="block text-2xl sm:text-4xl xl:text-6xl">{team.score}</span>
              </div>
            ))}
          </div>
        </div>

        {code && (isAdmin || !gameState.hideJoinCode) && (
          <p className="mt-10 text-base text-white/70 sm:text-xl xl:text-3xl">
            Join at {window.location.host} with code{" "}
            <span className="font-mono font-bold tracking-widest text-white">{code}</span>
          </p>
        )}

        {isAdmin && (
          <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-3 rounded-xl bg-white/10 p-4">
            <label htmlFor="pause-message" className="text-sm text-white/80">
              Message on the TV
            </label>
            <input
              id="pause-message"
              type="text"
              value={draft}
              maxLength={PAUSE_MESSAGE_MAX_LENGTH}
              placeholder={DEFAULT_PAUSE_MESSAGE}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={saveDraft}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveDraft();
              }}
              className="w-full rounded border p-2 text-gray-900"
            />
            <button
              type="button"
              onClick={onResume}
              className="rounded-lg bg-accent px-6 py-2 font-semibold text-ink shadow-lg hover:brightness-110"
            >
              ▶ Resume game
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntermissionScreen;
