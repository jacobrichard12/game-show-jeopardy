import React, { createContext, useContext, useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";

// URL of the Socket.IO server. Override with REACT_APP_SOCKET_URL (baked in
// at build time, like all CRA REACT_APP_ vars) to point at a LAN IP or a
// separately-hosted server. Left unset:
//  - in a production build, `undefined` tells socket.io-client to connect to
//    whatever origin served the page — correct for the common case of one
//    server serving both the built app and the socket (server.ts already
//    does this via express.static), and avoids needing to know the deployed
//    URL before you've built and deployed it.
//  - in dev, falls back to the local server so `npm start` keeps working
//    with zero config.
const SOCKET_URL =
  process.env.REACT_APP_SOCKET_URL ||
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:4000");

// Where the admin token is cached in this browser so the host doesn't have to
// re-enter it on every visit. Only the admin panel ever writes to this; the
// display view never needs a token.
export const ADMIN_TOKEN_STORAGE_KEY = "adminToken";

const readStoredAdminToken = (): string | undefined => {
  try {
    return window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || undefined;
  } catch {
    // localStorage can throw in private-browsing / locked-down contexts.
    return undefined;
  }
};

export type AdminAuthStatus = "pending" | "authorized" | "denied";

// Define context type with socket and children
interface SocketContextType {
  socket: Socket | null;
  adminAuthStatus: AdminAuthStatus;
  // Stores the token for this browser and reconnects the socket so the
  // server re-checks the handshake with it. Pass "" to clear it.
  setAdminToken: (token: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Custom hook to access socket from context
export const useSocket = (): Socket | null => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context.socket;
};

// Whether this browser's socket has been confirmed as an admin by the server.
// Subscribed here (not in Admin.tsx) because the server sends its answer
// (`adminAuthResult`) immediately at connect time — before App.tsx clears its
// loading gate and mounts the /admin route — so a listener registered inside
// Admin.tsx would miss it. Socket.IO doesn't replay missed events.
export const useAdminAuthStatus = (): AdminAuthStatus => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useAdminAuthStatus must be used within a SocketProvider");
  }
  return context.adminAuthStatus;
};

// Lets the admin panel supply/replace the shared admin token for this browser.
export const useSetAdminToken = (): ((token: string) => void) => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSetAdminToken must be used within a SocketProvider");
  }
  return context.setAdminToken;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [adminAuthStatus, setAdminAuthStatus] = useState<AdminAuthStatus>("pending");

  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      auth: { token: readStoredAdminToken() },
    });

    socketInstance.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    socketInstance.on("adminAuthResult", (data: { isAdmin: boolean }) => {
      setAdminAuthStatus(data.isAdmin ? "authorized" : "denied");
    });

    // A previously-accepted token can still be rejected later (e.g. the host
    // rotates ADMIN_TOKEN mid-event) if an action is attempted after that.
    socketInstance.on("unauthorized", () => {
      setAdminAuthStatus("denied");
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  const setAdminToken = (token: string) => {
    try {
      window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } catch {
      // Best-effort cache; the token still works for this session via
      // socket.auth below even if it can't be persisted.
    }
    if (socket) {
      setAdminAuthStatus("pending");
      socket.auth = { token };
      // Re-handshake so the server re-evaluates admin status with the new token.
      socket.disconnect();
      socket.connect();
    }
  };

  return (
    <SocketContext.Provider value={{ socket, adminAuthStatus, setAdminToken }}>
      {children}
    </SocketContext.Provider>
  );
};
