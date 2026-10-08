import React, { useEffect, useRef, useState } from "react";

// Host lobby: the full TV link for this game, to copy into a chat or open on
// the TV's browser. Copy uses the Clipboard API; where that's blocked (e.g.
// a plain-http LAN address) it selects the link so Cmd/Ctrl+C works.
const WatchLink: React.FC<{ code: string }> = ({ code }) => {
  const url = `${window.location.origin}/watch/${code}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "copied" | "selected">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timer = setTimeout(() => setStatus("idle"), 2000);
    return () => clearTimeout(timer);
  }, [status]);

  const selectLink = () => {
    inputRef.current?.select();
    setStatus("selected");
  };
  const copy = () => {
    if (!navigator.clipboard?.writeText) return selectLink();
    navigator.clipboard.writeText(url).then(() => setStatus("copied"), selectLink);
  };

  return (
    <div className="mx-auto mt-6 flex w-full max-w-xl flex-col items-center gap-2 rounded-lg bg-black/40 p-3 sm:flex-row">
      <label htmlFor="watch-link" className="shrink-0 text-sm font-semibold text-white/80">
        TV link
      </label>
      <input
        id="watch-link"
        ref={inputRef}
        readOnly
        value={url}
        onFocus={(e) => e.target.select()}
        className="w-full min-w-0 rounded bg-white/90 px-2 py-1 font-mono text-sm text-ink"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded bg-accent px-3 py-1 text-sm font-semibold text-ink hover:brightness-110"
      >
        {status === "copied" ? "Copied!" : status === "selected" ? "Press ⌘C" : "Copy"}
      </button>
    </div>
  );
};

export default WatchLink;
