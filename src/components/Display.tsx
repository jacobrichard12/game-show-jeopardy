import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import gameBoardData from "../data/gameBoard.json";
import { GameState } from "../shared/types";
import PageWrapper from "./PageWrapper";
import { useSocket } from "./SocketContext";
import TitlePage from "./TitlePage";

type JoinStatus = "joining" | "joined" | "not_found";

// The spectator/projector view for one specific room, joined by its code.
// Read-only: it never sends state, only receives it.
const Display: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const socket = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<JoinStatus>("joining");

  useEffect(() => {
    if (!socket || !code) return;
    const upperCode = code.toUpperCase();

    // Re-sent on every (re)connect, not just once on mount, so a dropped
    // connection rejoins the same room automatically once it reconnects.
    const join = () => socket.emit("joinGame", { code: upperCode });

    const handleJoined = (data: { code: string; gameState: GameState }) => {
      if (data.code !== upperCode) return;
      setGameState(data.gameState);
      setStatus("joined");
    };
    const handleNotFound = () => setStatus("not_found");
    // The server only routes this to sockets it has joined to this room, but
    // a socket can end up briefly in more than one room's group when
    // switching games without a full page reload (see server.ts's
    // leaveCurrentRoom) — checking the code here is cheap insurance against
    // ever rendering another room's state.
    const handleGameStateUpdate = (data: { code: string; gameState: GameState }) => {
      if (data.code !== upperCode) return;
      setGameState(data.gameState);
    };

    socket.on("connect", join);
    socket.on("gameJoined", handleJoined);
    socket.on("gameNotFound", handleNotFound);
    socket.on("gameStateUpdate", handleGameStateUpdate);

    if (socket.connected) join();

    return () => {
      socket.off("connect", join);
      socket.off("gameJoined", handleJoined);
      socket.off("gameNotFound", handleNotFound);
      socket.off("gameStateUpdate", handleGameStateUpdate);
    };
  }, [socket, code]);

  if (status === "not_found") {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-4">
        <h1 className="text-2xl font-bold mb-2">Game not found</h1>
        <p className="text-gray-600">
          No game is running with code "{code?.toUpperCase()}". Double-check
          the code with your host.
        </p>
      </div>
    );
  }

  if (status === "joining" || !gameState) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 italic">
        Joining game...
      </div>
    );
  }

  return !gameState.started ? (
    <TitlePage
      isAdmin={false}
      gameState={gameState}
      sendGameStateToServer={() => {}}
    />
  ) : (
    <PageWrapper gameState={gameState} gameBoardData={gameBoardData} />
  );
};

export default Display;
