import React from "react";
import { Route, Routes } from "react-router-dom";
import Admin from "./components/Admin";
import CreateGame from "./components/CreateGame";
import Display from "./components/Display";
import JoinGame from "./components/JoinGame";
import Sandbox from "./components/Sandbox";
import { SocketProvider } from "./components/SocketContext";

// /sandbox is a local test bench for the party games (no server needed). It's
// on in development, and off in production builds unless REACT_APP_SANDBOX is
// "true" at build time, so the live site doesn't expose unfinished games.
const SANDBOX_ENABLED =
  process.env.NODE_ENV !== "production" || process.env.REACT_APP_SANDBOX === "true";

// Each room is its own isolated game, addressed by a short code:
//  /            - enter a code to watch a game (display/spectator)
//  /watch/:code - the display for that specific game
//  /admin       - create a new game (ADMIN_TOKEN-gated)
//  /admin/:code - the host panel for that specific game
// There's no more single global game state — Admin and Display each own
// the room they're scoped to via the URL, joining it over the socket.
const App: React.FC = () => {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<JoinGame />} />
        <Route path="/watch/:code" element={<Display />} />
        <Route path="/admin" element={<CreateGame />} />
        <Route path="/admin/:code" element={<Admin />} />
        {SANDBOX_ENABLED && <Route path="/sandbox" element={<Sandbox />} />}
      </Routes>
    </div>
  );
};

export const AppWithProviders: React.FC = () => (
  <SocketProvider>
    <App />
  </SocketProvider>
);

export default AppWithProviders;
