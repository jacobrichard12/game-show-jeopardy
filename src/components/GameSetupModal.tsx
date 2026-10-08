import React, { useEffect, useRef, useState } from "react";
import { toThemeId } from "../shared/themes";
import { GameState, MAX_TEAMS } from "../shared/types";
import GameSetupForm, { GameSetup, setupPayload, usePackList } from "./GameSetupForm";
import { useSocket } from "./SocketContext";

interface GameSetupModalProps {
  code: string;
  gameState: GameState;
  onClose: () => void;
}

// The current game's setup, as the form's starting point.
function setupFrom(gameState: GameState): GameSetup {
  const names = gameState.teams.map((team) => team.name);
  return {
    teamCount: gameState.teams.length,
    teamNames: [...names, ...Array(MAX_TEAMS - names.length).fill("")],
    theme: toThemeId(gameState.theme),
    packId: gameState.packId ?? "",
  };
}

// Host lobby only: change teams, theme or content pack before the game
// starts. The server rebuilds the game in the same room (reconfigureGame), so
// the TV keeps its connection and just updates.
const GameSetupModal: React.FC<GameSetupModalProps> = ({ code, gameState, onClose }) => {
  const socket = useSocket();
  const packs = usePackList();
  const [setup, setSetup] = useState(() => setupFrom(gameState));
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close once the rebuilt game arrives (a new gameState after Apply).
  const stateAtApply = useRef<GameState | null>(null);
  useEffect(() => {
    if (applying && stateAtApply.current && gameState !== stateAtApply.current) onClose();
  }, [applying, gameState, onClose]);

  useEffect(() => {
    if (!socket) return;
    const handleError = (data: { reason: string }) => {
      setApplying(false);
      setError(data.reason);
    };
    socket.on("reconfigureError", handleError);
    return () => {
      socket.off("reconfigureError", handleError);
    };
  }, [socket]);

  // Escape cancels, like Settings.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const apply = () => {
    if (!socket || applying) return;
    setError(null);
    setApplying(true);
    stateAtApply.current = gameState;
    socket.emit("reconfigureGame", { code, ...setupPayload(setup) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-label="Game setup"
        className="w-full max-w-sm max-h-[90vh] overflow-y-auto rounded bg-white p-6 shadow-lg"
      >
        <h2 className="mb-1 text-xl font-bold text-center">Game setup</h2>
        <p className="mb-4 text-sm text-gray-600 text-center">
          Changes apply to this game ({code}); the TV updates without rejoining.
        </p>
        {error && <p className="mb-4 text-sm text-red-600 text-center">{error}</p>}
        <GameSetupForm value={setup} onChange={setSetup} packs={packs} onSubmit={apply} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={applying}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {applying ? "Applying..." : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameSetupModal;
