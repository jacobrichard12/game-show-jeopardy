import React from "react";
import { ThemeId, THEMES } from "../shared/themes";

interface ThemePickerProps {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
}

// Board theme choice, used on Create Game and in Settings. Each option
// previews a board tile in that theme's colors.
const ThemePicker: React.FC<ThemePickerProps> = ({ value, onChange }) => (
  <div className="grid grid-cols-4 gap-2 mb-4" role="group" aria-label="Board theme">
    {THEMES.map((option) => (
      <button
        key={option.id}
        type="button"
        onClick={() => onChange(option.id)}
        aria-pressed={value === option.id}
        className={`flex flex-col items-center gap-1 rounded border p-1 text-xs ${
          value === option.id
            ? "border-blue-500 ring-2 ring-blue-500"
            : "border-gray-300 hover:bg-gray-100"
        }`}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-full items-center justify-center rounded font-semibold"
          style={{ backgroundColor: option.swatch.tile, color: option.swatch.accent }}
        >
          $100
        </span>
        {option.label}
      </button>
    ))}
  </div>
);

export default ThemePicker;
