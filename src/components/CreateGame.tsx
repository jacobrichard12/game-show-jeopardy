import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teamColor } from "../shared/teamColors";
import { ThemeId } from "../shared/themes";
import {
  defaultTeamName,
  MAX_TEAMS,
  MIN_TEAMS,
  TEAM_NAME_MAX_LENGTH,
} from "../shared/types";
import { storeAdminKey, useSocket } from "./SocketContext";
import ThemePicker from "./ThemePicker";

const TEAM_COUNT_OPTIONS = Array.from(
  { length: MAX_TEAMS - MIN_TEAMS + 1 },
  (_, i) => MIN_TEAMS + i
);

// Landing page for hosts: create a new game (gated by the venue's
// ADMIN_TOKEN, same as before) and get redirected to /admin/:code to run it.
const CreateGame: React.FC = () => {
  const socket = useSocket();
  const navigate = useNavigate();
  const [adminToken, setAdminToken] = useState("");
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  // Kept for all MAX_TEAMS slots so a name survives lowering then raising the
  // team count; blanks fall back to "Team A/B/…" on the server.
  const [teamNames, setTeamNames] = useState<string[]>(() =>
    Array(MAX_TEAMS).fill("")
  );
  // Custom content packs available on the server (names only); "" = None.
  const [packs, setPacks] = useState<{ id: string; name: string }[]>([]);
  const [packId, setPackId] = useState("");
  const [theme, setTheme] = useState<ThemeId>("original");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleCreated = (data: { code: string; adminKey: string }) => {
      storeAdminKey(data.code, data.adminKey);
      navigate(`/admin/${data.code}`);
    };
    const handleCreateError = (data: { reason: string }) => {
      setCreating(false);
      setError(data.reason);
    };

    socket.on("gameCreated", handleCreated);
    socket.on("gameCreateError", handleCreateError);
    return () => {
      socket.off("gameCreated", handleCreated);
      socket.off("gameCreateError", handleCreateError);
    };
  }, [socket, navigate]);

  // Ask once per socket for the server's content packs (names only).
  useEffect(() => {
    if (!socket) return;
    const handlePackList = (data: { packs: { id: string; name: string }[] }) =>
      setPacks(data.packs);
    socket.on("packList", handlePackList);
    socket.emit("listPacks");
    return () => {
      socket.off("packList", handlePackList);
    };
  }, [socket]);

  const handleCreate = () => {
    if (!socket) return;
    setError(null);
    setCreating(true);
    socket.emit("createGame", {
      adminToken,
      teamCount,
      teamNames: teamNames.slice(0, teamCount),
      theme,
      ...(packId ? { packId } : {}),
    });
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
      <div className="bg-white p-6 sm:p-8 rounded shadow-lg w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">Host a Game</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Enter the admin token for this event. Leave blank if the host
          hasn't set one (local/LAN play).
        </p>
        {error && (
          <p className="text-sm text-red-600 mb-4 text-center">{error}</p>
        )}
        <input
          type="password"
          autoComplete="off"
          value={adminToken}
          onChange={(e) => setAdminToken(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          className="w-full border rounded p-2 mb-4"
          placeholder="Admin token"
          autoFocus
        />
        <label className="block text-sm text-gray-600 mb-2 text-center">
          Number of teams
        </label>
        <div className="flex space-x-2 mb-4">
          {TEAM_COUNT_OPTIONS.map((count) => (
            <button
              key={count}
              type="button"
              onClick={() => setTeamCount(count)}
              className={`flex-1 py-2 rounded border font-semibold ${
                teamCount === count
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
          {teamNames.slice(0, teamCount).map((name, i) => (
            <div key={i} className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-full ${teamColor(i).chip}`}
              />
              <input
                type="text"
                value={name}
                maxLength={TEAM_NAME_MAX_LENGTH}
                onChange={(e) => {
                  const value = e.target.value;
                  setTeamNames((prev) =>
                    prev.map((n, j) => (j === i ? value : n))
                  );
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
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
        <ThemePicker value={theme} onChange={setTheme} />
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
              value={packId}
              onChange={(e) => setPackId(e.target.value)}
              className="w-full border rounded p-2 mb-4 bg-white"
            >
              <option value="">None (standard questions)</option>
              {packs.map((pack) => (
                <option key={pack.id} value={pack.id}>
                  {pack.name}
                </option>
              ))}
            </select>
          </>
        )}
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create Game"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/")}
          className="w-full mt-2 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default CreateGame;
