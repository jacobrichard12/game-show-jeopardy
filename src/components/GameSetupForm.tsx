import React, { useEffect, useState } from "react";
import { teamColor } from "../shared/teamColors";
import { ThemeId } from "../shared/themes";
import { defaultTeamName, MAX_TEAMS, MIN_TEAMS, TEAM_NAME_MAX_LENGTH } from "../shared/types";
import { useSocket } from "./SocketContext";
import ThemePicker from "./ThemePicker";

// A game's setup: chosen on Create Game, and changeable from the host's lobby
// (⚙️ Game setup) until the game starts.
export interface GameSetup {
  teamCount: number;
  // Kept for all MAX_TEAMS slots so a name survives lowering then raising the
  // team count; blanks fall back to "Team A/B/…" on the server.
  teamNames: string[];
  theme: ThemeId;
  packId: string; // "" = Standard
}

export const defaultSetup = (): GameSetup => ({
  teamCount: MIN_TEAMS,
  teamNames: Array(MAX_TEAMS).fill(""),
  theme: "original",
  packId: "",
});

// What createGame / reconfigureGame send to the server.
export function setupPayload(setup: GameSetup) {
  return {
    teamCount: setup.teamCount,
    teamNames: setup.teamNames.slice(0, setup.teamCount),
    theme: setup.theme,
    ...(setup.packId ? { packId: setup.packId } : {}),
  };
}

export interface PackOption {
  id: string;
  name: string;
}

// The server's content packs (names only), asked for once per socket.
export function usePackList(): PackOption[] {
  const socket = useSocket();
  const [packs, setPacks] = useState<PackOption[]>([]);
  useEffect(() => {
    if (!socket) return;
    const handlePackList = (data: { packs: PackOption[] }) => setPacks(data.packs);
    socket.on("packList", handlePackList);
    socket.emit("listPacks");
    return () => {
      socket.off("packList", handlePackList);
    };
  }, [socket]);
  return packs;
}

const TEAM_COUNT_OPTIONS = Array.from(
  { length: MAX_TEAMS - MIN_TEAMS + 1 },
  (_, i) => MIN_TEAMS + i
);

interface GameSetupFormProps {
  value: GameSetup;
  onChange: (setup: GameSetup) => void;
  packs: PackOption[];
  // Enter in a team name field submits (Create Game / Apply).
  onSubmit?: () => void;
}

const GameSetupForm: React.FC<GameSetupFormProps> = ({ value, onChange, packs, onSubmit }) => {
  const set = (patch: Partial<GameSetup>) => onChange({ ...value, ...patch });

  return (
    <>
      <label className="block text-sm text-gray-600 mb-2 text-center">
        Number of teams
      </label>
      <div className="flex space-x-2 mb-4">
        {TEAM_COUNT_OPTIONS.map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => set({ teamCount: count })}
            className={`flex-1 py-2 rounded border font-semibold ${
              value.teamCount === count
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
            }`}
          >
            {count}
          </button>
        ))}
      </div>
      <label className="block text-sm text-gray-600 mb-2 text-center">
        Team names (optional)
      </label>
      <div className="flex flex-col gap-2 mb-4">
        {value.teamNames.slice(0, value.teamCount).map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 rounded-full ${teamColor(i).chip}`}
            />
            <input
              type="text"
              value={name}
              maxLength={TEAM_NAME_MAX_LENGTH}
              onChange={(e) =>
                set({ teamNames: value.teamNames.map((n, j) => (j === i ? e.target.value : n)) })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") onSubmit?.();
              }}
              aria-label={`${defaultTeamName(i)} name`}
              placeholder={defaultTeamName(i)}
              className="w-full border rounded p-2"
            />
          </div>
        ))}
      </div>
      <label className="block text-sm text-gray-600 mb-2 text-center">
        Board theme
      </label>
      <ThemePicker value={value.theme} onChange={(theme) => set({ theme })} />
      {packs.length > 0 && (
        <>
          <label
            htmlFor="content-pack"
            className="block text-sm text-gray-600 mb-2 text-center"
          >
            Content pack
          </label>
          <select
            id="content-pack"
            value={value.packId}
            onChange={(e) => set({ packId: e.target.value })}
            className="w-full border rounded p-2 mb-4 bg-white"
          >
            <option value="">Standard</option>
            {packs.map((pack) => (
              <option key={pack.id} value={pack.id}>
                {pack.name}
              </option>
            ))}
          </select>
        </>
      )}
    </>
  );
};

export default GameSetupForm;
