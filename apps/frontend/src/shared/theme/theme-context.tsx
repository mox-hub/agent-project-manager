import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type ThemePreset, getInitialThemePreset, persistThemePreset } from './presets';

/**
 * 主题**意图**（用户在「主题模式」里选的那一档）——`system` = 跟随系统。
 * 与 `ResolvedTheme` 的分工是本模块的核心：意图可以有三档，落到 DOM 上的只有一个。
 */
export type ThemeMode = 'light' | 'dark' | 'system';
/** 意图落到实际生效的主题（`system` 按 `prefers-color-scheme` 解析后的结果） */
export type ResolvedTheme = 'light' | 'dark';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppearanceSettings {
  zoom: number;
  fontSize: FontSize;
  /** 界面字体（sans）自定义字体族名；空串 = 跟随默认字体链（宪法 §2.1） */
  userSansFont: string;
  /** 等宽字体（mono）自定义字体族名；空串 = 跟随默认字体链 */
  userMonoFont: string;
}

interface ThemeContextType {
  /** 用户选的意图（三档，含 `system`）——「主题模式」选择器读它 */
  mode: ThemeMode;
  /**
   * 实际生效的主题（`system` 解析后只剩 light / dark）。
   * **凡是要按「现在是不是深色」做判断的消费方一律读这个**，不要读 `mode`：
   * `mode === 'dark'` 在「跟随系统 + 系统是深色」时会得到 false（意图是 system），
   * 图例 / 标签 / 主题化的图表配色会因此错档。
   */
  resolvedMode: ResolvedTheme;
  /** 当前主题预设（宪法 §5.6 只保留 default 一套）。接口保留供未来多主题，
      刻意不暴露 setter：当前无任何 UI 入口，无消费方的公开 API 是负债。 */
  preset: ThemePreset;
  appearance: AppearanceSettings;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setAppearance: (settings: Partial<AppearanceSettings>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'theme-mode';
const APPEARANCE_STORAGE_KEY = 'appearance-settings';

const defaultAppearance: AppearanceSettings = {
  zoom: 100,
  fontSize: 'medium',
  userSansFont: '',
  userMonoFont: '',
};

/**
 * 系统当前偏好（jsdom 未实现 matchMedia，故两处都要判存在性再取用）。
 * 非浏览器环境（SSR / 单测）回落 light。
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  // 无存量 = 首次使用：默认「跟随系统」。这不是行为变更——旧版首屏也是取系统偏好，
  // 区别只是旧版取完就写死，本版此后继续跟随。
  return 'system';
}

function getInitialAppearance(): AppearanceSettings {
  if (typeof window === 'undefined') return defaultAppearance;

  try {
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (stored) {
      // 旧版存量（fontFamily: sans/mono）不迁移，统一回落默认字体链
      return { ...defaultAppearance, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return defaultAppearance;
}

/** 字体设置只写 --font-user-* 变量（宪法 §2.1：组件只消费 font-sans/font-mono token） */
function applyUserFont(root: HTMLElement, cssVar: string, familyName: string) {
  const trimmed = familyName.trim().replace(/["']/g, '');
  if (trimmed) {
    root.style.setProperty(cssVar, `"${trimmed}"`);
  } else {
    root.style.removeProperty(cssVar);
  }
}

function applyAppearanceToDocument(appearance: AppearanceSettings) {
  const root = document.documentElement;
  root.style.setProperty('--zoom-factor', String(appearance.zoom / 100));
  applyUserFont(root, '--font-user-sans', appearance.userSansFont);
  applyUserFont(root, '--font-user-mono', appearance.userMonoFont);
  root.style.setProperty('--font-size-scale', getFontSizeScale(appearance.fontSize));
}

function getFontSizeScale(fontSize: FontSize): string {
  switch (fontSize) {
    case 'small': return '0.875';
    case 'large': return '1.125';
    default: return '1';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);
  // preset 当前无变更入口（T4 裁决：移除死接口），故只取初值不暴露 setter
  const [preset] = useState<ThemePreset>(getInitialThemePreset);
  const [appearance, setAppearanceState] = useState<AppearanceSettings>(getInitialAppearance);

  // 系统偏好实时变化 → 跟随系统时立刻换肤（不跟随也更新缓存值，切回 system 时能立即对齐）
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const resolvedMode: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  useEffect(() => {
    // 落盘的始终是**意图**（三档）——刷新后才能还原「跟随系统」这个选择本身
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolvedMode);
    document.documentElement.setAttribute('data-theme-preset', preset);
  }, [mode, resolvedMode, preset]);

  useEffect(() => {
    persistThemePreset(preset);
    document.documentElement.setAttribute('data-theme-preset', preset);
  }, [preset]);

  useEffect(() => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance));
    applyAppearanceToDocument(appearance);
  }, [appearance]);

  const setTheme = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  // 取反的基准是**当前生效主题**而非意图：处于「跟随系统」时若按意图取反，
  // 系统正好是深色则点一下仍是深色，观感像按钮失灵。
  const toggleTheme = () => {
    setModeState(resolvedMode === 'light' ? 'dark' : 'light');
  };

  const setAppearance = (settings: Partial<AppearanceSettings>) => {
    setAppearanceState(prev => ({ ...prev, ...settings }));
  };

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, preset, appearance, toggleTheme, setTheme, setAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
