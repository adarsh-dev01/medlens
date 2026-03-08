"use client";

import { useAccessibilitySettings } from "@/hooks/use-accessibility-settings";
import { cn } from "@/lib/utils";

type ToggleButtonProps = {
  active: boolean;
  label: string;
  ariaLabel: string;
  onClick: () => void;
  activeClassName: string;
};

function ToggleButton({
  active,
  label,
  ariaLabel,
  onClick,
  activeClassName
}: ToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
        active
          ? activeClassName
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-300"
      )}
    >
      {label}
    </button>
  );
}

export function AccessibilityControls() {
  const { darkMode, toggleDarkMode } = useAccessibilitySettings();

  return (
    <div className="flex items-center gap-2">
      <ToggleButton
        active={darkMode}
        label={darkMode ? "\u2600" : "\u263E"}
        ariaLabel="Toggle dark mode"
        onClick={toggleDarkMode}
        activeClassName="border-slate-950 bg-slate-950 text-white"
      />
    </div>
  );
}
