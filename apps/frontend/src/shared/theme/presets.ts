// 设计宪法 §5.6（docs/design/PRINCIPLES.md）：只保留 linear 一套 preset，
// 保留 preset 接口（后续新增主题 = 扩展此类型 + index.css 增加对应 token 段）。
// 历史存量值（figma/notion）一律回落 linear。
export type ThemePreset = "linear";

const STORAGE_KEY = "theme-preset";

export function getInitialThemePreset(): ThemePreset {
  if (typeof window === "undefined") return "linear";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "linear") {
    return stored;
  }
  return "linear";
}

export function persistThemePreset(preset: ThemePreset) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, preset);
}
