// 设计宪法 §5.6（docs/design/PRINCIPLES.md）：只保留 default 一套 preset，
// 保留 preset 接口（后续新增主题 = 扩展此类型 + index.css 增加对应 token 段）。
// 历史存量值（linear / figma / notion）与未知值一律回落 default。
export type ThemePreset = "default";

const STORAGE_KEY = "theme-preset";

export function getInitialThemePreset(): ThemePreset {
  if (typeof window === "undefined") return "default";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "default") return "default";
  // 存量自愈：旧装可能存的是 "linear"，更早版本是 "figma" / "notion"；
  // key 刻意不改名（避免双重迁移），改为在此处一次性覆写回 default。
  if (stored !== null) {
    localStorage.setItem(STORAGE_KEY, "default");
  }
  return "default";
}

export function persistThemePreset(preset: ThemePreset) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, preset);
}
