import React, { useEffect, useMemo, useState } from "react";
import { DecorId } from "../shared/decor";
import { DECOR_ITEMS, DecorGlyph, PARTY_BURST } from "./decorItems";

const RINGS = 5;
const PER_RING = 10;
const RING_GAP_S = 0.22;
// How long the tunnel is on screen; the board zooms in over its second half
// (BOARD_ZOOM_CLASS on Display's board wrapper).
export const TUNNEL_MS = 2200;
export const BOARD_ZOOM_CLASS = "motion-safe:animate-board-zoom";
// The title screen stays up over the board at first, the tunnel streaming
// over it, then grows and fades as the viewer flies past it (no blank
// screen between the two). Its wrapper is removed after TUNNEL_MS.
export const TITLE_EXIT_CLASS =
  "pointer-events-none fixed inset-0 z-40 overflow-hidden motion-safe:animate-title-exit motion-reduce:hidden";

// On Start Game the TV flies down a tunnel into the board: rings of symbols
// (the pack's decor, or party emoji) stream out of the middle, growing as
// they pass the viewer. `tunnelKey` is bumped per start (0 = never), like
// boardIntro.
const StartTunnel: React.FC<{ tunnelKey: number; decor?: DecorId }> = ({ tunnelKey, decor }) => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!tunnelKey) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), TUNNEL_MS);
    return () => clearTimeout(timer);
  }, [tunnelKey]);

  const items = decor ? DECOR_ITEMS[decor] : PARTY_BURST;
  // Each ring is offset a little so the glyphs don't line up in spokes.
  const pieces = useMemo(
    () =>
      Array.from({ length: RINGS * PER_RING }, (_, i) => {
        const ring = Math.floor(i / PER_RING);
        const angle = ((i % PER_RING) + ring * 0.5) * ((2 * Math.PI) / PER_RING) + Math.random() * 0.2;
        const distance = 75; // vmax: well past the screen's edge
        return {
          dx: Math.cos(angle) * distance,
          dy: Math.sin(angle) * distance,
          delay: ring * RING_GAP_S + Math.random() * 0.08,
          size: 2 + Math.random(), // rem, before the zoom's scale-up
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tunnelKey]
  );
  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      data-testid="start-tunnel"
      className="pointer-events-none fixed inset-0 z-50 hidden overflow-hidden motion-safe:block"
    >
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-1/2 animate-tunnel-fly"
          style={
            {
              fontSize: `${piece.size}rem`,
              animationDelay: `${piece.delay}s`,
              "--dx": `${piece.dx}vmax`,
              "--dy": `${piece.dy}vmax`,
            } as React.CSSProperties
          }
        >
          <DecorGlyph item={items[i % items.length]} />
        </span>
      ))}
    </div>
  );
};

export default StartTunnel;
