import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Theme, type ThemeMode, lightTheme, darkTheme } from '../theme/theme';
import { type ThemePreset, getInitialThemePreset, persistThemePreset } from './presets';

export type FontFamily = 'default' | 'sans' | 'mono';
export type FontSize = 'small' | 'medium' | 'large';

export interface AppearanceSettings {
  zoom: number;
  fontFamily: FontFamily;
  fontSize: FontSize;
}

interface ThemeContextType {
  theme: Theme;
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
  fontFamily: 'default',
  fontSize: 'medium',
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
      return { ...defaultAppearance, ...JSON.parse(stored) };
    }
  } catch {
    // ignore parse errors
  }
  return defaultAppearance;
}

function applyAppearanceToDocument(appearance: AppearanceSettings) {
  const root = document.documentElement;
  root.style.setProperty('--zoom-factor', String(appearance.zoom / 100));
  root.style.fontFamily = getFontFamilyValue(appearance.fontFamily);
  root.style.setProperty('--font-size-scale', getFontSizeScale(appearance.fontSize));
}

function getFontFamilyValue(fontFamily: FontFamily): string {
  switch (fontFamily) {
    case 'sans': return 'system-ui, -apple-system, sans-serif';
    case 'mono': return 'ui-monospace, monospace';
    default: return 'inherit';
  }
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

  const theme = mode === 'light' ? lightTheme : darkTheme;

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
    <ThemeContext.Provider value={{ theme, mode, preset, appearance, toggleTheme, setTheme, setPreset, setAppearance }}>
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

// 便捷导出
export { lightTheme, darkTheme };
export type { Theme, ThemeMode };
