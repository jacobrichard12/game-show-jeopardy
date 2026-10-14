import React, { useRef, useState } from "react";

export type PaneView = "both" | "host" | "tv";

interface SplitPanesProps {
  view: PaneView;
  host: React.ReactNode;
  tv: React.ReactNode;
}

const clampShare = (share: number) => Math.min(80, Math.max(20, share));
// Where the divider starts (and double-click returns it): a quarter of the
// way across, so the TV gets most of the width.
export const DEFAULT_HOST_SHARE = 25;

// The sandbox pages' host and TV panels: side by side at xl+, split by a
// divider you drag like macOS split view (arrow keys nudge, double-click
// resets); stacked below xl; or just one of them.
const SplitPanes: React.FC<SplitPanesProps> = ({ view, host, tv }) => {
  // The host panel's share of the width, %.
  const [hostShare, setHostShare] = useState(DEFAULT_HOST_SHARE);
  const [dragging, setDragging] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const dragTo = (clientX: number) => {
    const box = mainRef.current?.getBoundingClientRect();
    if (box && box.width > 0 && Number.isFinite(clientX)) setHostShare(clampShare(((clientX - box.left) / box.width) * 100));
  };

  return (
    <>
      <main
        ref={mainRef}
        className={`mx-auto mt-4 grid gap-4 ${
          view === "both" ? "xl:grid-cols-[minmax(0,var(--host))_auto_minmax(0,var(--tv))] xl:gap-x-1" : "grid-cols-1"
        }`}
        style={{ "--host": `${hostShare}fr`, "--tv": `${100 - hostShare}fr` } as React.CSSProperties}
      >
        {view !== "tv" && host}
        {view === "both" && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize host and TV panels"
            aria-valuemin={20}
            aria-valuemax={80}
            aria-valuenow={Math.round(hostShare)}
            tabIndex={0}
            title="Drag to resize; double-click to reset"
            onPointerDown={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDoubleClick={() => setHostShare(DEFAULT_HOST_SHARE)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setHostShare((s) => clampShare(s - 2));
              if (e.key === "ArrowRight") setHostShare((s) => clampShare(s + 2));
            }}
            className="group hidden w-3 cursor-col-resize items-center justify-center xl:flex"
          >
            <span
              className={`h-16 w-1.5 rounded-full transition-colors ${
                dragging ? "bg-blue-500" : "bg-gray-300 group-hover:bg-gray-500 group-focus:bg-blue-500"
              }`}
            />
          </div>
        )}
        {view !== "host" && tv}
      </main>
      {/* While dragging, a full-window layer takes the pointer so the frames
          and YouTube iframes under it can't swallow the moves. */}
      {dragging && (
        <div
          data-testid="resize-layer"
          className="fixed inset-0 z-50 cursor-col-resize"
          onPointerMove={(e) => dragTo(e.clientX)}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        />
      )}
    </>
  );
};

// Both / Host / TV, for the sandbox pages' bars.
export const PaneViewSwitch: React.FC<{ view: PaneView; onChange: (view: PaneView) => void }> = ({ view, onChange }) => (
  <div className="ml-auto flex overflow-hidden rounded border" role="group" aria-label="View">
    {(["both", "host", "tv"] as PaneView[]).map((v) => (
      <button
        key={v}
        type="button"
        onClick={() => onChange(v)}
        aria-pressed={view === v}
        aria-label={v === "both" ? "Both" : v === "host" ? "Host only" : "TV only"}
        title={v === "both" ? "Host panel and TV side by side" : v === "host" ? "Only the host panel" : "Only the TV"}
        className={`px-2 py-1 ${view === v ? "bg-gray-800 text-white" : "bg-white hover:bg-gray-100"}`}
      >
        {v === "both" ? "Both" : v === "host" ? "Host" : "TV"}
      </button>
    ))}
  </div>
);

export default SplitPanes;
