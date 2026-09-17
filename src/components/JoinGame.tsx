import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Landing page ("/"): pick a role. "Host a Game" goes to /admin to create
// one; "Join a Game" reveals a code entry and goes to /watch/:code to
// spectate a game someone else is hosting.
const JoinGame: React.FC = () => {
  const navigate = useNavigate();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [code, setCode] = useState("");

  const handleJoin = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    navigate(`/watch/${trimmed}`);
  };

  return (
    <div className="relative h-screen w-screen bg-gradient-to-br from-blue-700 via-purple-800 to-black flex items-center justify-center overflow-hidden">
      <div className="relative bg-white p-8 rounded-lg shadow-lg w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-6">Game Show Jeopardy</h1>

        {!showJoinForm ? (
          <div className="flex flex-col space-y-3">
            <button
              onClick={() => navigate("/admin")}
              className="w-full bg-blue-500 text-white py-3 rounded hover:bg-blue-600 font-semibold"
            >
              Host a Game
            </button>
            <button
              onClick={() => setShowJoinForm(true)}
              className="w-full bg-gray-200 text-gray-800 py-3 rounded hover:bg-gray-300 font-semibold"
            >
              Join a Game
            </button>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Enter the game code shown on the host's screen.
            </p>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleJoin();
              }}
              maxLength={4}
              placeholder="CODE"
              autoFocus
              className="w-full border rounded p-3 mb-4 text-center text-3xl tracking-[0.5em] font-bold uppercase"
            />
            <div className="flex space-x-2">
              <button
                onClick={() => setShowJoinForm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
              >
                Back
              </button>
              <button
                onClick={handleJoin}
                disabled={!code.trim()}
                className="flex-1 bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Game
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinGame;
