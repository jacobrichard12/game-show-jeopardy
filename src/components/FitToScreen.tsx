import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useFrameWindow } from "./frameContext";

interface FitToScreenProps {
  children: React.ReactNode;
  // Largest enlargement for sparse content, so a short question fills the
  // screen without becoming absurdly huge.
  maxScale?: number;
  // Below this the content would be unreadable; it scrolls instead.
  minScale?: number;
  // Fit only when this media query matches (e.g. a laptop/TV-width screen).
  // Phones keep normal scrolling.
  media?: string;
}

// Scales its content to exactly fill the box it's given, shrinking tall
// content and enlarging short content, so nothing on the TV ever needs
// scrolling. The content is laid out at width W/scale and then scaled by
// `scale`, so it reflows to a wider layout rather than just getting smaller.
// A binary search finds the largest scale whose scaled height still fits
// (scaled height grows with scale, since a narrower layout wraps more).
//
// Note: a CSS transform traps `position: fixed` descendants inside the scaled
// box, so full-screen overlays in games must portal to document.body.
const FitToScreen: React.FC<FitToScreenProps> = ({
  children,
  maxScale = 1.6,
  minScale = 0.35,
  media = "(min-width: 1024px)",
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // The page's window, or a sandbox frame's (so the media query is the
  // frame's width).
  const win = useFrameWindow();
  const [enabled, setEnabled] = useState(() => matches(media, win));

  useEffect(() => {
    if (typeof win.matchMedia !== "function") return;
    const query = win.matchMedia(media);
    const update = () => setEnabled(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, [media, win]);

  const fit = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const width = outer.clientWidth;
    const height = outer.clientHeight;
    // No layout (hidden tab, or a test environment): leave content as is.
    if (!width || !height) return;

    const scaledHeightAt = (scale: number) => {
      inner.style.width = `${width / scale}px`;
      return inner.offsetHeight * scale;
    };

    let scale: number;
    if (scaledHeightAt(maxScale) <= height) {
      scale = maxScale;
    } else if (scaledHeightAt(minScale) > height) {
      scale = minScale;
    } else {
      let lo = minScale;
      let hi = maxScale;
      for (let i = 0; i < 12; i++) {
        const mid = (lo + hi) / 2;
        if (scaledHeightAt(mid) <= height) lo = mid;
        else hi = mid;
      }
      scale = lo;
    }

    const contentHeight = scaledHeightAt(scale);
    // Center vertically when there's room to spare at the largest scale.
    const top = Math.max(0, (height - contentHeight) / 2);
    inner.style.transform = `translate(0, ${top}px) scale(${scale})`;
  }, [maxScale, minScale]);

  // Re-fit when the box resizes, the content's height changes (a reveal
  // changes the unscaled layout, which the observer sees; transforms don't
  // count), or web fonts finish loading. The fit's own width change can
  // trigger one more pass, which lands on the same scale, so it settles.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!enabled || !outer || !inner) return;

    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(fit);
    };
    fit();

    const resize = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
    resize?.observe(outer);
    resize?.observe(inner);
    document.fonts?.ready.then(schedule).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      resize?.disconnect();
      inner.style.width = "";
      inner.style.transform = "";
    };
  }, [enabled, fit]);

  if (!enabled) return <>{children}</>;

  return (
    // flex-1/min-h-0 so it takes the rest of a flex column; h-full otherwise.
    // overflow-y-auto only matters at minScale (a last-resort scroll).
    <div ref={outerRef} className="relative h-full min-h-0 w-full flex-1 overflow-y-auto overflow-x-hidden">
      <div ref={innerRef} className="absolute left-0 top-0 origin-top-left">
        {children}
      </div>
    </div>
  );
};

function matches(media: string, win: Window): boolean {
  return typeof win !== "undefined" && typeof win.matchMedia === "function" ? win.matchMedia(media).matches : false;
}

export default FitToScreen;
