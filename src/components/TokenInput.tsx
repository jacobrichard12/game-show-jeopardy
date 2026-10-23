import React, { useState } from "react";

// The admin-token field (Create Game, reclaiming a game, the sandbox gate):
// hidden as you type, with an eye button to show it and check for typos.
// Not inside a <form>, so Chrome doesn't offer to save it (see Admin.tsx).
const TokenInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
  className?: string;
}> = ({ value, onChange, onEnter, className = "" }) => {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? "text" : "password"}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter();
        }}
        className="w-full rounded border p-2 pr-10"
        placeholder="Admin token"
        aria-label="Admin token"
        autoFocus
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide token" : "Show token"}
        aria-pressed={visible}
        title={visible ? "Hide token" : "Show token"}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500 hover:text-gray-800"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
};

export default TokenInput;
