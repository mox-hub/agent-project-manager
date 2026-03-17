import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type Theme, type ThemeMode, lightTheme, darkTheme } from '../theme/theme';
import { type ThemePreset, getInitialThemePreset, persistThemePreset } from './presets';

interface ThemeContextType {
  theme: Theme;
  mode: ThemeMode;
  preset: ThemePreset;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  setPreset: (preset: ThemePreset) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'theme-mode';

function getInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }

  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(getInitialMode);
  const [preset, setPresetState] = useState<ThemePreset>(getInitialThemePreset);

  const theme = mode === 'light' ? lightTheme : darkTheme;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, mode);
    // Use class-based dark mode for shadcn/ui compatibility
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(mode);
    document.documentElement.setAttribute('data-theme-preset', preset);
  }, [mode, preset]);

  useEffect(() => {
    persistThemePreset(preset);
    document.documentElement.setAttribute('data-theme-preset', preset);
  }, [preset]);

  const setTheme = (newMode: ThemeMode) => {
    setModeState(newMode);
  };

  const toggleTheme = () => {
    setModeState(prev => prev === 'light' ? 'dark' : 'light');
  };

  const setPreset = (nextPreset: ThemePreset) => {
    setPresetState(nextPreset);
  };

  return (
    <ThemeContext.Provider value={{ theme, mode, preset, toggleTheme, setTheme, setPreset }}>
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
