import React from "react";
import { Route, Routes } from "react-router-dom";
import Admin from "./components/Admin";
import CreateGame from "./components/CreateGame";
import Display from "./components/Display";
import JoinGame from "./components/JoinGame";
import { SocketProvider } from "./components/SocketContext";

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
