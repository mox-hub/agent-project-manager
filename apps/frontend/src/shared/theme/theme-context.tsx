import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type ThemePreset, getInitialThemePreset, persistThemePreset } from './presets';

export type ThemeMode = 'light' | 'dark';
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
  mode: ThemeMode;
  preset: ThemePreset;
  appearance: AppearanceSettings;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
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

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
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
  const [preset, setPresetState] = useState<ThemePreset>(getInitialThemePreset);
  const [appearance, setAppearanceState] = useState<AppearanceSettings>(getInitialAppearance);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
    document.documentElement.setAttribute('data-theme-preset', preset);
  }, [mode, preset]);

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

  const toggleTheme = () => {
    setModeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setPreset = (nextPreset: ThemePreset) => {
    setPresetState(nextPreset);
  };

  const setAppearance = (settings: Partial<AppearanceSettings>) => {
    setAppearanceState(prev => ({ ...prev, ...settings }));
  };

  return (
    <ThemeContext.Provider value={{ mode, preset, appearance, toggleTheme, setTheme, setPreset, setAppearance }}>
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
