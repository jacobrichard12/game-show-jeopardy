import React, { useState, useEffect } from "react";
import { GameState, Team } from "../shared/types";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newGameState: GameState) => void;
  gameState: GameState;
  onReset: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  gameState,
  onReset,
}) => {
  const [newGameState, setNewGameState] = useState<GameState>(gameState);
  const [showResetModal, setIsResetting] = useState(false);

  // Synchronize modal state with parent `gameState` whenever it changes
  useEffect(() => {
    setNewGameState(gameState);
  }, [gameState]);

  const handleInputChange = (
    team: Team,
    field: "name" | "score",
    value: string | number
  ) => {
    setNewGameState((prevState) => ({
      ...prevState,
      [team]: {
        ...prevState[team],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave(newGameState);
    onClose();
  };

  const handleReset = () => {
    setIsResetting(true);
  };

  const handleConfirmReset = () => {
    onReset();
    setIsResetting(false);
    onClose();
  };

  const handleCancelReset = () => {
    setIsResetting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-4">Settings</h2>

        {/* Team A Settings */}
        <div className="mb-4">
          <label className="block mb-2">
            {newGameState[Team.TeamA].name} Name
          </label>
          <input
            type="text"
            value={newGameState[Team.TeamA].name}
            onChange={(e) =>
              handleInputChange(Team.TeamA, "name", e.target.value)
            }
            className="border p-2 w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">
            {newGameState[Team.TeamA].name} Score
          </label>
          <input
            type="number"
            value={newGameState[Team.TeamA].score}
            onChange={(e) =>
              handleInputChange(Team.TeamA, "score", Number(e.target.value))
            }
            className="border p-2 w-full"
          />
        </div>

        {/* Team B Settings */}
        <div className="mb-4">
          <label className="block mb-2">
            {newGameState[Team.TeamB].name} Name
          </label>
          <input
            type="text"
            value={newGameState[Team.TeamB].name}
            onChange={(e) =>
              handleInputChange(Team.TeamB, "name", e.target.value)
            }
            className="border p-2 w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block mb-2">
            {newGameState[Team.TeamB].name} Score
          </label>
          <input
            type="number"
            value={newGameState[Team.TeamB].score}
            onChange={(e) =>
              handleInputChange(Team.TeamB, "score", Number(e.target.value))
            }
            className="border p-2 w-full"
          />
        </div>

        {/* Save and Reset Buttons */}
        <div className="flex justify-between">
          <button
            onClick={handleSave}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Save
          </button>
          <button
            onClick={handleReset}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Reset
          </button>
        </div>

        {/* Confirmation Dialog for Reset */}
        {showResetModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-white p-6 rounded shadow-lg text-center">
              <h3 className="mb-4 text-xl">
                Are you sure you want to reset the game?
              </h3>
              <div className="flex justify-between">
                <button
                  onClick={handleConfirmReset}
                  className="bg-red-500 text-white px-4 py-2 rounded"
                >
                  Yes
                </button>
                <button
                  onClick={handleCancelReset}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  No
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
