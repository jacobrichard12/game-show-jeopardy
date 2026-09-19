import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MAX_TEAMS, MIN_TEAMS } from "../shared/types";
import { storeAdminKey, useSocket } from "./SocketContext";

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

  const handleCreate = () => {
    if (!socket) return;
    setError(null);
    setCreating(true);
    socket.emit("createGame", { adminToken, teamCount });
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
