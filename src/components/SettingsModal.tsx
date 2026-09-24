import React, { useState, useEffect } from "react";
import { toThemeId } from "../shared/themes";
import { GameState } from "../shared/types";
import ThemePicker from "./ThemePicker";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGameState: GameState) => void;
  gameState: GameState;
  onReset: () => void;
  onEndGame: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  gameState,
  onReset,
  onEndGame,
}) => {
  const [newGameState, setNewGameState] = useState<GameState>(gameState);
  const [showResetModal, setIsResetting] = useState(false);

  // Synchronize modal state with parent `gameState` whenever it changes
  useEffect(() => {
    setNewGameState(gameState);
  }, [gameState]);

  const handleInputChange = (
    teamId: string,
    field: "name" | "score",
    value: string | number
  ) => {
    setNewGameState((prevState) => ({
      ...prevState,
      teams: prevState.teams.map((team) =>
        team.id === teamId ? { ...team, [field]: value } : team
      ),
    }));
  };

  const handleSave = () => {
    onSave(newGameState);
    onClose();
  };

  // Closing without saving discards any edits, so reopening starts from the
  // live state instead of a half-typed one.
  const handleCancel = () => {
    setNewGameState(gameState);
    setIsResetting(false);
    onClose();
  };

  // Escape backs out one level: the reset confirmation first, then the modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showResetModal) {
        setIsResetting(false);
      } else {
        setNewGameState(gameState);
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, showResetModal, gameState, onClose]);

  const handleReset = () => {
    setIsResetting(true);
  };

  const handleConfirmReset = () => {
    onReset();
    setIsResetting(false);
    onClose();
  };

  // Unsaved team edits are discarded, like Cancel; ending is undoable from
  // the end screen's "Back to board", so it needs no confirmation.
  const handleEndGame = () => {
    setNewGameState(gameState);
    onEndGame();
    onClose();
  };

  const handleCancelReset = () => {
    setIsResetting(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4"
      onClick={(e) => {
        // Clicking the dimmed backdrop (not the panel) closes without saving.
        if (e.target === e.currentTarget) handleCancel();
      }}
    >
      {/* max-h + overflow so 4 teams' worth of fields scroll on short screens */}
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={handleCancel}
            aria-label="Close settings"
            className="text-gray-500 hover:text-gray-800 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {newGameState.teams.map((team) => (
          <div key={team.id}>
            <div className="mb-4">
              <label className="block mb-2">{team.name} Name</label>
              <input
                type="text"
                value={team.name}
                onChange={(e) =>
                  handleInputChange(team.id, "name", e.target.value)
                }
                className="border p-2 w-full"
              />
            </div>
            <div className="mb-4">
              <label className="block mb-2">{team.name} Score</label>
              <input
                type="number"
                value={team.score}
                onChange={(e) =>
                  handleInputChange(team.id, "score", Number(e.target.value))
                }
                className="border p-2 w-full"
              />
            </div>
          </div>
        ))}

        {/* Applied with Save, like the team fields. */}
        <p className="block mb-2">Board theme</p>
        <ThemePicker
          value={toThemeId(newGameState.theme)}
          onChange={(theme) => setNewGameState((prev) => ({ ...prev, theme }))}
        />

        {!gameState.gameOver && (
          <button
            onClick={handleEndGame}
            className="mb-4 w-full rounded bg-amber-500 px-4 py-2 font-semibold text-white hover:bg-amber-600"
          >
            🏆 End game &amp; show winner
          </button>
        )}

        {/* Reset is deliberately set apart from the everyday Cancel/Save pair */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={handleReset}
            className="border border-red-500 text-red-600 px-4 py-2 rounded hover:bg-red-50"
          >
            Reset game…
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Save
            </button>
          </div>
        </div>

        {/* Confirmation Dialog for Reset */}
        {showResetModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded shadow-lg text-center">
              <h3 className="mb-2 text-xl">Reset the game?</h3>
              <p className="mb-4 text-sm text-gray-600">
                This clears all scores and the board and can't be undone.
              </p>
              <div className="flex justify-between gap-2">
                {/* Safe choice first, and focused by default */}
                <button
                  autoFocus
                  onClick={handleCancelReset}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Keep playing
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="border border-red-500 text-red-600 px-4 py-2 rounded hover:bg-red-50"
                >
                  Yes, reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
