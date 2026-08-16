/**
 * Linear 风格设计 Token
 * 参考 Linear 界面：深色侧栏 + 浅色主内容、极简表格、清晰层级
 */

export const linearColors = {
  /** 侧栏 - 深灰背景 */
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
  /** 主内容区 - 浅色 */
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
  /** 状态与强调 */
  status: {
    onTrack: '#16a34a',
    onTrackBg: 'rgba(22, 163, 74, 0.12)',
    atRisk: '#ca8a04',
    offTrack: '#dc2626',
    priorityHigh: '#ea580c',
    priorityMedium: '#ca8a04',
  },
  /** 表格行悬停 */
  rowHover: '#fafaf9',
};

export const linearTypography = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Roboto, "Helvetica Neue", Arial, sans-serif',
  fontSize: {
    xs: '11px',
    sm: '12px',
    md: '13px',
    lg: '14px',
    xl: '16px',
    title: '18px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
};

export const linearSpacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
};

export const linearRadii = {
  sm: 4,
  md: 6,
  lg: 8,
};
