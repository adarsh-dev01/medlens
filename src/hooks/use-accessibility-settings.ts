"use client";

import { useEffect } from "react";

import { useLocalStorage } from "@/hooks/use-local-storage";

type AccessibilitySettings = {
  darkMode: boolean;
};

const defaultSettings: AccessibilitySettings = {
  darkMode: false
};

export function useAccessibilitySettings() {
  const [settings, setSettings, isLoaded] = useLocalStorage<AccessibilitySettings>(
    "medlens-accessibility",
    defaultSettings
  );

  const darkMode = Boolean(
    settings.darkMode ??
      (settings as AccessibilitySettings & { highContrast?: boolean }).highContrast
  );

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    document.documentElement.classList.toggle("dark-mode", darkMode);
    document.documentElement.classList.remove("large-text-mode");
    document.body.classList.toggle("dark-mode", darkMode);
    document.body.classList.remove("high-contrast");
    document.body.classList.remove("large-text-mode");
  }, [darkMode, isLoaded]);

  return {
    darkMode,
    toggleDarkMode: () =>
      setSettings((current) => ({
        ...current,
        darkMode: !Boolean(
          current.darkMode ??
            (current as AccessibilitySettings & { highContrast?: boolean }).highContrast
        )
      }))
  };
}
