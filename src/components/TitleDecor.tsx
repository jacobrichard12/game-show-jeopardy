import React, { useMemo } from "react";
import { DecorId } from "../shared/decor";
import { DECOR_ITEMS, DecorGlyph } from "./decorItems";

const PIECES = 18;

// A pack's decor on the lobby title screen: its symbols rise slowly from the
// bottom, faint, behind the title (TitlePage). Nothing when there's no decor.
const TitleDecor: React.FC<{ decor?: DecorId }> = ({ decor }) => {
  const items = decor ? DECOR_ITEMS[decor] : undefined;
  // Random positions picked once, so re-renders don't make them jump.
  const pieces = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: (i / PIECES) * 100 + Math.random() * (100 / PIECES),
        size: 2 + Math.random() * 2.5, // rem
        duration: 14 + Math.random() * 10, // s
        delay: Math.random() * 24, // s, negative below: the screen starts full
        opacity: 0.35 + Math.random() * 0.3,
      })),
    []
  );
  if (!items) return null;

  return (
    // motion-safe: skipped for viewers who ask for reduced motion.
    <div
      aria-hidden="true"
      data-testid="title-decor"
      className="pointer-events-none absolute inset-0 hidden motion-safe:block"
    >
      {pieces.map((piece, i) => (
        <span
          key={i}
          className="absolute top-0 animate-decor-rise"
          style={{
            left: `${piece.left}%`,
            fontSize: `${piece.size}rem`,
            opacity: piece.opacity,
            animationDuration: `${piece.duration}s`,
            animationDelay: `-${piece.delay}s`,
          }}
        >
          <DecorGlyph item={items[i % items.length]} />
        </span>
      ))}
    </div>
  );
};

export default TitleDecor;
