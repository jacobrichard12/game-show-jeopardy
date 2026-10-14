import { useEffect, useRef, useState } from "react";
import { SandboxPack } from "../shared/types";
import { readStoredToken } from "./sandboxToken";
import { useOptionalSocket } from "./SocketContext";

// The sandbox pages' content: the server's pack list, and a chosen pack
// fetched behind the admin token the page was opened with (server
// "sandboxPack"). `onLoaded` runs with the new pack, or null for the
// samples, so the page can rebuild its game. Without a server there are no
// packs and the pages run on their samples.
export function useSandboxPacks(onLoaded: (pack: SandboxPack | null) => void) {
  const socket = useOptionalSocket();
  const [packList, setPackList] = useState<{ id: string; name: string }[]>([]);
  const [pack, setPack] = useState<SandboxPack | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  // The latest callback, for the server's async reply.
  const onLoadedRef = useRef(onLoaded);
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    if (!socket) return;
    const handleList = (data: { packs: { id: string; name: string }[] }) => setPackList(data.packs);
    const handlePack = (data: { ok: boolean; reason?: string; pack?: SandboxPack }) => {
      if (!data.ok || !data.pack) {
        setMessage(data.reason ?? "Couldn't load that pack.");
        return;
      }
      setPack(data.pack);
      setMessage(null);
      onLoadedRef.current(data.pack);
    };
    socket.on("packList", handleList);
    socket.on("sandboxPackResult", handlePack);
    socket.emit("listPacks");
    return () => {
      socket.off("packList", handleList);
      socket.off("sandboxPackResult", handlePack);
    };
  }, [socket]);

  const choosePack = (id: string) => {
    if (!id) {
      setPack(null);
      setMessage(null);
      onLoadedRef.current(null);
      return;
    }
    setMessage("Loading…");
    socket?.emit("sandboxPack", { adminToken: readStoredToken(), packId: id });
  };

  return { packList, pack, message, choosePack };
}
