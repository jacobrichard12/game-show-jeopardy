import React, { useEffect, useRef, useState } from "react";
import { setMuted, setVolume, useMuted, useVolume } from "../shared/sound";

// The display's master sound controls (game sounds and YouTube videos),
// tucked behind a faint corner button so they don't sit on the TV picture.
const SoundMenu: React.FC = () => {
  const muted = useMuted();
  const volume = useVolume();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on a click outside the menu or on Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="fixed bottom-2 right-2 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          role="dialog"
          aria-label="Sound settings"
          className="flex items-center gap-3 rounded-lg bg-black/80 px-3 py-2 text-sm text-white"
        >
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? "Unmute sound" : "Mute sound"}
            className="rounded-full px-2 py-1 hover:bg-white/20"
          >
            {muted ? "🔇 Sound off" : "🔊 Sound on"}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volume * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            aria-label="Volume"
            className="w-28 accent-white"
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Sound settings"
        aria-expanded={open}
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-xl ring-1 ring-white/30 transition-opacity hover:opacity-100 focus-visible:opacity-100 ${
          open ? "opacity-100" : "opacity-50"
        }`}
      >
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
};

export default SoundMenu;
