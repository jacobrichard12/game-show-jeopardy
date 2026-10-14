import React, { useLayoutEffect, useRef, useState } from "react";

interface VirtualScreenProps {
  children: React.ReactNode;
  // The screen being previewed, in CSS pixels (default a 1080p TV).
  width?: number;
  // "auto": as tall as the content (a panel that just scales with its width,
  // like the sandbox's host panel).
  height?: number | "auto";
}

// Lays its content out on a fixed-width "screen" and scales the whole thing
// to the available width, like a thumbnail: text, tiles and buttons all grow
// and shrink together as the window (or the sandbox's divider) changes. Used
// by the sandbox's TV panel (a 1080p screen) and host panel (auto height).
//
// Note: the scale is a CSS transform, so `position: fixed` descendants stay
// inside the screen; full-window overlays portal to document.body.
const VirtualScreen: React.FC<VirtualScreenProps> = ({ children, width = 1920, height = 1080 }) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // null = no layout to measure (hidden, or a test): render unscaled.
  const [scale, setScale] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const update = () => {
      const available = outer.clientWidth;
      setScale(available > 0 ? available / width : null);
      setContentHeight(inner.offsetHeight);
    };
    update();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(update) : null;
    observer?.observe(outer);
    // Auto height follows the content (transforms don't affect offsetHeight).
    if (height === "auto") observer?.observe(inner);
    return () => observer?.disconnect();
  }, [width, height]);

  const screenHeight = height === "auto" ? contentHeight : height;
  return (
    <div
      ref={outerRef}
      className="relative w-full overflow-hidden"
      style={scale ? { height: screenHeight * scale } : undefined}
    >
      <div
        ref={innerRef}
        className={scale ? "virtual-screen absolute left-0 top-0 origin-top-left" : "virtual-screen"}
        style={
          scale
            ? { width, ...(height === "auto" ? {} : { height }), transform: `scale(${scale})` }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
};

export default VirtualScreen;
