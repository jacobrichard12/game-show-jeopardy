import React from "react";
import { DecorId } from "../shared/decor";
// Openclipart, CC0 (sources: assets/lobby/images/SOURCES.md).
import chaliceAndBread from "../assets/lobby/images/chalice-and-bread.png";
import crossWithHalo from "../assets/lobby/images/cross-with-halo.png";
import doveFlying from "../assets/lobby/images/dove-flying.png";
import doveInFlame from "../assets/lobby/images/dove-in-flame.png";
import goldenCross from "../assets/lobby/images/golden-cross.png";
import maryAndJesusGold from "../assets/lobby/images/mary-and-jesus-gold.png";
import monstranceRays from "../assets/lobby/images/monstrance-rays.png";
import monstrance from "../assets/lobby/images/monstrance.png";
import openBible from "../assets/lobby/images/open-bible.png";
import papalMitre from "../assets/lobby/images/papal-mitre.png";
import pentecostFlame from "../assets/lobby/images/pentecost-flame.png";
import prayingHands from "../assets/lobby/images/praying-hands.png";
import sacredHeart from "../assets/lobby/images/sacred-heart.png";
import starOfBethlehem from "../assets/lobby/images/star-of-bethlehem.png";
import whiteDove from "../assets/lobby/images/white-dove.png";
import woodenCross from "../assets/lobby/images/wooden-cross.png";

// The glyphs behind each title-screen decor (shared/decor.ts): emoji,
// simple one-color icons drawn here (they take the theme's accent color), or
// clip art images.
type Icon = React.FC<{ className?: string }>;
export type DecorItem = string | Icon | { image: string };

const svgProps = {
  viewBox: "0 0 48 48",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const CrossIcon: Icon = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M24 5v38M13 16h22" strokeWidth={4} />
  </svg>
);

const DoveIcon: Icon = ({ className }) => (
  <svg {...svgProps} className={className}>
    {/* Body and tail, beak to the right, with a raised wing. */}
    <path
      d="M6 30c5 1 9 0 12-2 4-3 8-6 14-6 3 0 5-2 6-4l5-1-4 3c0 8-6 14-15 15l-4 5-1-6c-5 0-10-1-13-4z"
      fill="currentColor"
      stroke="none"
    />
    <path d="M20 26c-1-7-5-13-12-17 1 8 4 13 10 17" fill="currentColor" stroke="none" />
    <path d="M24 24c1-8 5-13 13-16-2 7-5 12-10 15" fill="currentColor" stroke="none" />
  </svg>
);

const FlameIcon: Icon = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path
      d="M24 4c2 8 12 12 12 25a12 12 0 0 1-24 0c0-6 3-10 6-13 0 4 2 7 4 8-1-7 0-14 2-20z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

const SacredHeartIcon: Icon = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M24 44S7 33 7 21a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 12-17 23-17 23z" />
    <path d="M24 4v10M19.5 8h9" />
  </svg>
);

const ChiRhoIcon: Icon = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M24 5v38M13 15l22 22M35 15L13 37" />
    <path d="M24 5h6a6.5 6.5 0 0 1 0 13h-6" />
  </svg>
);

const StarIcon: Icon = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M24 4l5.5 13.5H44l-11.5 9 4.5 15L24 33l-13 8.5 4.5-15L4 17.5h14.5z" />
  </svg>
);

const CandleIcon: Icon = ({ className }) => (
  <svg {...svgProps} className={className}>
    <path d="M24 4c3 4 4 7 0 11-4-4-3-7 0-11z" fill="currentColor" stroke="none" />
    <path d="M17 19h14v24H17z" />
    <path d="M12 43h24" />
  </svg>
);

export const DECOR_ITEMS: Record<DecorId, DecorItem[]> = {
  "catholic-emoji": ["✝️", "🕊️", "🙏", "📿", "⛪", "🕯️", "😇", "✨", "🔥", "❤️‍🔥"],
  "catholic-icons": [CrossIcon, DoveIcon, FlameIcon, SacredHeartIcon, ChiRhoIcon, StarIcon, CandleIcon],
  "catholic-clipart": [
    { image: chaliceAndBread },
    { image: crossWithHalo },
    { image: doveFlying },
    { image: doveInFlame },
    { image: goldenCross },
    { image: maryAndJesusGold },
    { image: monstranceRays },
    { image: monstrance },
    { image: openBible },
    { image: papalMitre },
    { image: pentecostFlame },
    { image: prayingHands },
    { image: sacredHeart },
    { image: starOfBethlehem },
    { image: whiteDove },
    { image: woodenCross },
  ],
};

// The start burst for games without a decor.
export const PARTY_BURST: DecorItem[] = ["🎉", "✨", "⭐", "🎊", "🌟"];

// One glyph, filling its (sized) parent.
export const DecorGlyph: React.FC<{ item: DecorItem }> = ({ item }) => {
  if (typeof item === "string") {
    return <span className="block leading-none">{item}</span>;
  }
  if ("image" in item) {
    // Clip art is a bit bigger than a glyph, so it reads at a distance.
    return <img src={item.image} alt="" className="block h-[1.4em] w-[1.4em] object-contain" draggable={false} />;
  }
  const Glyph = item;
  return <Glyph className="h-[1em] w-[1em] text-accent" />;
};
