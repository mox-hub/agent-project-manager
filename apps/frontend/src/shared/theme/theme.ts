/**
 * 统一主题系统 - 支持亮色与暗色模式
 * 基于 Linear 风格设计
 * 同步 Figma Design System v23+
 */

export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  // 侧栏
  sidebar: {
    bg: string;
    border: string;
    text: string;
    textMuted: string;
    textDim: string;
    hover: string;
    active: string;
    accent: string;
  };
  // 主内容区
  content: {
    bg: string;
    bgSecondary: string;
    border: string;
    borderLight: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textTertiary: string;
  };
  // 状态
  status: {
    onTrack: string;
    onTrackBg: string;
    atRisk: string;
    offTrack: string;
    priorityHigh: string;
    priorityMedium: string;
  };
  // 强调色（用于按钮、链接等）
  accent: {
    blue: string;
    blueLight: string;
    green: string;
    greenLight: string;
    purple: string;
    purpleLight: string;
    yellow: string;
    yellowLight: string;
  };
  // 交互
  interactive: {
    primary: string;
    primaryHover: string;
    secondary: string;
    ghost: string;
    ghostHover: string;
  };
  // 向后兼容别名
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  success: string;
  error: string;
  warning: string;
  surface: string;
  // Figma Design System v23 - 优先级颜色
  priority: {
    low: string;
    medium: string;
    high: string;
    urgent: string;
  };
  // Figma Design System v23 - 严重性颜色 (Bug)
  severity: {
    critical: string;
    high: string;
    medium: string;
    low: string;
  };
  // Figma Design System v23 - AI 管理颜色
  ai: {
    connected: string;
    active: string;
    skills: string;
    warning: string;
    error: string;
  };
  // Figma Design System v23 - 状态颜色
  taskStatus: {
    backlog: string;
    todo: string;
    inProgress: string;
    inReview: string;
    blocked: string;
    done: string;
    canceled: string;
  };
}

export interface ThemeTypography {
  fontFamily: string;
  fontSize: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    title: string;
  };
  fontWeight: {
    normal: number;
    medium: number;
    semibold: number;
  };
  lineHeight: {
    relaxed: number;
    normal: number;
    compact: number;
  };
  // 向后兼容简写
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

export interface ThemeSpacing {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  '2xl': number;
  '3xl': number;
}

export interface ThemeRadii {
  sm: number;
  md: number;
  lg: number;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
  typography: ThemeTypography;
  spacing: ThemeSpacing;
  radii: ThemeRadii;
}

// 亮色主题
export const lightTheme: Theme = {
  mode: 'light',
  colors: {
    sidebar: {
      bg: '#1c1917',
      border: '#292524',
      text: '#fafaf9',
      textMuted: '#a8a29e',
      textDim: '#78716c',
      hover: '#292524',
      active: '#44403c',
      accent: '#22c55e',
    },
    content: {
      bg: '#ffffff',
      bgSecondary: '#fafaf9',
      border: '#e7e5e4',
      borderLight: '#f5f5f4',
      text: '#1c1917',
      textSecondary: '#57534e',
      textMuted: '#78716c',
      textTertiary: '#a8a29e',
    },
    status: {
      onTrack: '#16a34a',
      onTrackBg: 'rgba(22, 163, 74, 0.12)',
      atRisk: '#ca8a04',
      offTrack: '#dc2626',
      priorityHigh: '#ea580c',
      priorityMedium: '#ca8a04',
    },
    interactive: {
      primary: '#1c1917',
      primaryHover: '#000000',
      secondary: '#f5f5f4',
      ghost: 'transparent',
      ghostHover: '#f5f5f4',
    },
    accent: {
      blue: '#3b82f6',
      blueLight: '#dbeafe',
      green: '#22c55e',
      greenLight: '#dcfce7',
      purple: '#a855f7',
      purpleLight: '#f3e8ff',
      yellow: '#eab308',
      yellowLight: '#fef9c3',
    },
    // 向后兼容别名
    text: '#1c1917',
    textSecondary: '#57534e',
    textMuted: '#78716c',
    primary: '#1c1917',
    success: '#16a34a',
    error: '#dc2626',
    warning: '#ca8a04',
    surface: '#fafaf9',
    // Figma Design System v23 - 优先级颜色
    priority: {
      low: '#64748b',      // slate-500
      medium: '#3b82f6',   // blue-500
      high: '#f97316',     // orange-500
      urgent: '#ef4444',   // red-500
    },
    // Figma Design System v23 - 严重性颜色 (Bug)
    severity: {
      critical: '#ef4444', // red-500
      high: '#f97316',    // orange-500
      medium: '#f59e0b',   // amber-500
      low: '#94a3b8',     // slate-400
    },
    // Figma Design System v23 - AI 管理颜色
    ai: {
      connected: '#10b981', // emerald-500
      active: '#3b82f6',   // blue-500
      skills: '#7c3aed',    // violet-500
      warning: '#f59e0b',   // amber-500
      error: '#ef4444',     // red-500
    },
    // Figma Design System v23 - 任务状态颜色
    taskStatus: {
      backlog: '#64748b',   // slate-500
      todo: '#64748b',      // slate-500
      inProgress: '#3b82f6', // blue-500
      inReview: '#f59e0b',  // amber-500
      blocked: '#ef4444',    // red-500
      done: '#22c55e',      // emerald-500
      canceled: '#94a3b8',   // slate-400
    },
  },
  typography: {
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: {
      xs: '11px',
      sm: '12px',
      md: '13px',
      lg: '14px',
      xl: '16px',
      '2xl': '20px',
      title: '18px',
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
    },
    lineHeight: {
      relaxed: 1.7,
      normal: 1.5,
      compact: 1.25,
    },
    // 向后兼容简写
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
    xl: '16px',
  },
  spacing: {
    xs: 4,
    sm: 6,
    md: 8,
    lg: 12,
    xl: 16,
    '2xl': 20,
    '3xl': 24,
  },
  radii: {
    sm: 4,
    md: 6,
    lg: 8,
  },
};

// 暗色主题
export const darkTheme: Theme = {
  mode: 'dark',
  colors: {
    sidebar: {
      bg: '#0c0a09',
      border: '#1c1917',
      text: '#fafaf9',
      textMuted: '#78716c',
      textDim: '#57534e',
      hover: '#1c1917',
      active: '#292524',
      accent: '#22c55e',
    },
    content: {
      bg: '#0c0a09',
      bgSecondary: '#1c1917',
      border: '#292524',
      borderLight: '#1c1917',
      text: '#fafaf9',
      textSecondary: '#a8a29e',
      textMuted: '#78716c',
      textTertiary: '#57534e',
    },
    status: {
      onTrack: '#22c55e',
      onTrackBg: 'rgba(34, 197, 94, 0.15)',
      atRisk: '#eab308',
      offTrack: '#ef4444',
      priorityHigh: '#f97316',
      priorityMedium: '#eab308',
    },
    interactive: {
      primary: '#fafaf9',
      primaryHover: '#ffffff',
      secondary: '#1c1917',
      ghost: 'transparent',
      ghostHover: '#1c1917',
    },
    accent: {
      blue: '#3b82f6',
      blueLight: '#1e3a5f',
      green: '#22c55e',
      greenLight: '#14532d',
      purple: '#a855f7',
      purpleLight: '#3b0764',
      yellow: '#eab308',
      yellowLight: '#422006',
    },
    // 向后兼容别名
    text: '#fafaf9',
    textSecondary: '#a8a29e',
    textMuted: '#78716c',
    primary: '#fafaf9',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#eab308',
    surface: '#1c1917',
    // Figma Design System v23 - 优先级颜色
    priority: {
      low: '#94a3b8',     // slate-400
      medium: '#60a5fa',   // blue-400
      high: '#fb923c',    // orange-400
      urgent: '#f87171',  // red-400
    },
    // Figma Design System v23 - 严重性颜色 (Bug)
    severity: {
      critical: '#f87171', // red-400
      high: '#fb923c',    // orange-400
      medium: '#fbbf24',  // amber-400
      low: '#94a3b8',     // slate-400
    },
    // Figma Design System v23 - AI 管理颜色
    ai: {
      connected: '#34d399', // emerald-400
      active: '#60a5fa',   // blue-400
      skills: '#a78bfa',    // violet-400
      warning: '#fbbf24',   // amber-400
      error: '#f87171',     // red-400
    },
    // Figma Design System v23 - 任务状态颜色
    taskStatus: {
      backlog: '#94a3b8',    // slate-400
      todo: '#94a3b8',      // slate-400
      inProgress: '#60a5fa', // blue-400
      inReview: '#fbbf24',  // amber-400
      blocked: '#f87171',   // red-400
      done: '#34d399',      // emerald-400
      canceled: '#94a3b8',  // slate-400
    },
  },
  typography: {
    ...lightTheme.typography,
  },
  spacing: lightTheme.spacing,
  radii: lightTheme.radii,
};

// 兼容旧 API - 导出为 tokens 供现有代码使用
export const themeTokens = {
  light: lightTheme,
  dark: darkTheme,
};
