export type ThemePreset = "figma" | "linear" | "notion";

const STORAGE_KEY = "theme-preset";

export function getInitialThemePreset(): ThemePreset {
  if (typeof window === "undefined") return "linear";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "figma" || stored === "linear" || stored === "notion") {
    return stored;
  }
  return "linear";
}

export function persistThemePreset(preset: ThemePreset) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, preset);
}

