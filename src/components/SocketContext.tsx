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

const SocketContext = createContext<Socket | null | undefined>(undefined);

// Custom hook to access socket from context
export const useSocket = (): Socket | null => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const socketInstance = io(SOCKET_URL);

    socketInstance.on("connect", () => {
      console.log("Connected to Socket.IO server");
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

// A room's adminKey proves "this browser created (or was granted admin on)
// this room" so a reload doesn't require re-entering ADMIN_TOKEN. Cached per
// room code — only the admin panel ever writes these; the display view
// never needs one.
const adminKeyStorageKey = (code: string) => `adminKey:${code.toUpperCase()}`;

export function getStoredAdminKey(code: string): string | undefined {
  try {
    return window.localStorage.getItem(adminKeyStorageKey(code)) || undefined;
  } catch {
    // localStorage can throw in private-browsing / locked-down contexts.
    return undefined;
  }
}

export function storeAdminKey(code: string, adminKey: string): void {
  try {
    window.localStorage.setItem(adminKeyStorageKey(code), adminKey);
  } catch {
    // Best-effort cache; the key still works for this session via the
    // in-memory join call even if it can't be persisted.
  }
}
