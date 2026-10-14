import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createRoot, Root } from "react-dom/client";
import { FrameContext } from "./frameContext";

// A device size to preview at. "actual" = the panel's own width, so a narrow
// panel really shows the phone layout.
export type DeviceSize = "actual" | "phone" | "tablet" | "laptop" | "tv";

export const DEVICE_SIZES: { id: DeviceSize; label: string; width?: number; height?: number }[] = [
  { id: "actual", label: "Actual width" },
  { id: "phone", label: "Phone", width: 390, height: 844 },
  { id: "tablet", label: "Tablet", width: 820, height: 1180 },
  { id: "laptop", label: "Laptop", width: 1280, height: 800 },
  { id: "tv", label: "TV (1080p)", width: 1920, height: 1080 },
];

interface DeviceFrameProps {
  children: React.ReactNode;
  size: DeviceSize;
  // With "actual": the frame's height. "auto" follows the content (a host
  // panel); "tv" is 16:9 of the width.
  actualHeight?: "auto" | "tv";
  title: string;
}

// The sandbox's preview screens: an iframe the size of a real device, so the
// app's responsive layouts (Tailwind's sm/md/lg/xl breakpoints, which follow
// the window width) respond to the device, not the browser window. Children
// render through their own React root inside the frame (events work there),
// with the page's styles and theme copied in. A device wider than the panel
// is scaled down to fit, like a thumbnail; its layout stays the device's.
//
// Code that needs the frame's window or document (portals, matchMedia,
// measuring) gets them from FrameContext (useFrameWindow / useFrameDocument).
//
// In tests (jsdom: no layout, and queries can't see into frames) the children
// render inline instead.
const DeviceFrame: React.FC<DeviceFrameProps> = ({ children, size, actualHeight = "auto", title }) => {
  const inline = process.env.NODE_ENV === "test";
  const outerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<Root | null>(null);
  const [frameDoc, setFrameDoc] = useState<Document | null>(null);
  const [panelWidth, setPanelWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(600);

  // The panel's width: the "actual" device width, and what bigger devices
  // scale down to.
  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer || inline) return;
    const update = () => setPanelWidth(outer.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    return () => observer.disconnect();
  }, [inline]);

  // Set up the frame once: its styles (kept in sync with the page's, which
  // change during development), the theme attributes, and a React root.
  useEffect(() => {
    const frame = frameRef.current;
    const doc = frame?.contentDocument;
    if (!frame || !doc || inline) return;
    doc.open();
    doc.write(
      '<!doctype html><html><head><meta charset="utf-8"><style id="frame-base">body{margin:0}</style></head>' +
        '<body><div id="frame-root"></div></body></html>'
    );
    doc.close();

    const syncStyles = () => {
      doc.head.querySelectorAll("[data-copied-style]").forEach((node) => node.remove());
      document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
        const copy = node.cloneNode(true) as HTMLElement;
        copy.setAttribute("data-copied-style", "");
        doc.head.appendChild(copy);
      });
    };
    const syncTheme = () => {
      const from = document.documentElement;
      const to = doc.documentElement;
      Array.from(to.attributes).forEach((attr) => to.removeAttribute(attr.name));
      Array.from(from.attributes).forEach((attr) => to.setAttribute(attr.name, attr.value));
    };
    syncStyles();
    syncTheme();
    const styleObserver = new MutationObserver(syncStyles);
    styleObserver.observe(document.head, { childList: true, subtree: true, characterData: true });
    const themeObserver = new MutationObserver(syncTheme);
    themeObserver.observe(document.documentElement, { attributes: true });

    rootRef.current = createRoot(doc.getElementById("frame-root")!);
    setFrameDoc(doc);
    return () => {
      styleObserver.disconnect();
      themeObserver.disconnect();
      const root = rootRef.current;
      rootRef.current = null;
      // Unmount after this render pass (React warns on a synchronous one).
      setTimeout(() => root?.unmount(), 0);
    };
  }, [inline]);

  // Draw the children into the frame on every render, with the frame's own
  // window and document in context.
  useLayoutEffect(() => {
    const root = rootRef.current;
    const win = frameRef.current?.contentWindow;
    if (!root || !frameDoc || !win) return;
    root.render(<FrameContext.Provider value={{ win, doc: frameDoc }}>{children}</FrameContext.Provider>);
  });

  // A fixed-height device: the page fills the frame (h-full / min-h-screen
  // layouts). Auto height: the page is its natural height.
  const device = DEVICE_SIZES.find((d) => d.id === size)!;
  const fixedHeight = !!device.height || actualHeight === "tv";
  useEffect(() => {
    const base = frameDoc?.getElementById("frame-base");
    if (!base) return;
    base.textContent = fixedHeight ? "html,body,#frame-root{height:100%}body{margin:0}" : "body{margin:0}";
  }, [frameDoc, fixedHeight]);

  // Auto height: follow the content's height inside the frame.
  useEffect(() => {
    if (!frameDoc || inline) return;
    const win = frameDoc.defaultView as (Window & typeof globalThis) | null;
    if (!win) return;
    const measure = () => setContentHeight(Math.max(200, frameDoc.documentElement.scrollHeight));
    const observer = new win.ResizeObserver(measure);
    observer.observe(frameDoc.body);
    measure();
    return () => observer.disconnect();
  }, [frameDoc, inline]);

  if (inline) return <div title={title}>{children}</div>;

  const width = device.width ?? panelWidth;
  const height =
    device.height ?? (actualHeight === "tv" ? Math.round((panelWidth * 9) / 16) : contentHeight);
  // Bigger than the panel: shrink to fit (the frame keeps its own width).
  const scale = panelWidth > 0 && width > panelWidth ? panelWidth / width : 1;

  return (
    <div ref={outerRef} className="w-full overflow-hidden" style={{ height: height * scale }}>
      <iframe
        ref={frameRef}
        title={title}
        className="block origin-top-left border-0"
        style={{ width, height, transform: scale === 1 ? undefined : `scale(${scale})` }}
      />
    </div>
  );
};

// The Size picker in a sandbox panel's header.
export const DeviceSizePicker: React.FC<{
  label: string;
  value: DeviceSize;
  onChange: (size: DeviceSize) => void;
  dark?: boolean;
}> = ({ label, value, onChange, dark = false }) => (
  <select
    aria-label={label}
    title="Preview at this device size (a bigger device is scaled down to fit)"
    value={value}
    onChange={(e) => onChange(e.target.value as DeviceSize)}
    className={`rounded border px-1 py-0.5 text-xs ${dark ? "border-white/20 bg-ink text-white" : "bg-white"}`}
  >
    {DEVICE_SIZES.map((d) => (
      <option key={d.id} value={d.id}>
        {d.label}
      </option>
    ))}
  </select>
);

export default DeviceFrame;
