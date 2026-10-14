import React, { useEffect, useState } from "react";
import Sandbox from "./Sandbox";
import { readStoredToken, storeToken } from "./sandboxToken";
import { useSocket } from "./SocketContext";

// /sandbox is only for the host (ROADMAP S1): the server checks the venue's
// ADMIN_TOKEN before the page renders (always allowed when none is set, as in
// local dev). This hides the page, not its code; the bundle holds only
// filler content (S2), so that's enough.

type GateStatus = "checking" | "locked" | "open";

const SandboxGate: React.FC = () => {
  const socket = useSocket();
  const [status, setStatus] = useState<GateStatus>("checking");
  const [tokenInput, setTokenInput] = useState("");
  const [rejected, setRejected] = useState(false);
  // The token being checked (numbered, so retrying the same token re-checks),
  // starting with the one remembered from earlier in this tab.
  const [check, setCheck] = useState(() => ({ token: readStoredToken(), attempt: 0 }));

  useEffect(() => {
    if (!socket) return;
    const handleResult = (data: { ok: boolean }) => {
      if (data.ok) {
        storeToken(check.token);
        setStatus("open");
      } else {
        setRejected(check.token !== "");
        setStatus("locked");
      }
    };
    socket.on("adminTokenResult", handleResult);
    socket.emit("verifyAdminToken", { adminToken: check.token });
    return () => {
      socket.off("adminTokenResult", handleResult);
    };
  }, [socket, check]);

  if (status === "open") return <Sandbox />;

  if (status === "checking") {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 italic px-4 text-center">
        Checking access...
      </div>
    );
  }

  const submit = () => {
    setStatus("checking");
    setCheck((prev) => ({ token: tokenInput, attempt: prev.attempt + 1 }));
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-8">
      {/* Not a <form>, for the same reason as Admin's token prompt: a real
          submit with a password field makes Chrome offer to save it. */}
      <div className="bg-white p-6 sm:p-8 rounded shadow-lg w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">Sandbox</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          The test bench is for the host. Enter the admin token to continue.
        </p>
        {rejected && (
          <p className="text-sm text-red-600 mb-4 text-center">
            That token was rejected — try again.
          </p>
        )}
        <input
          type="password"
          autoComplete="off"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          className="w-full border rounded p-2 mb-4"
          placeholder="Admin token"
          aria-label="Admin token"
          autoFocus
        />
        <button
          type="button"
          onClick={submit}
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default SandboxGate;
