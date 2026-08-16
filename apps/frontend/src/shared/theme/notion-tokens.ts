/**
 * Notion 风格设计系统
 * 参考 Notion UI 设计语言: 简洁、最小化、功能性强
 */

export const notionColors = {
  // 主色调 - 浅色模式
  background: {
    default: '#FFFFFF',
    secondary: '#F7F6F3',
    tertiary: '#EFEFE9',
    hover: '#EFEFEF',
    active: '#E8E7E4',
  },
  
  // 文字颜色 - Notion 经典深灰
  text: {
    primary: 'rgb(55, 53, 47)',
    secondary: 'rgba(55, 53, 47, 0.65)',
    tertiary: 'rgba(55, 53, 47, 0.45)',
    placeholder: 'rgba(55, 53, 47, 0.3)',
  },
  
  // 强调色 - Notion 蓝
  accent: {
    blue: 'rgb(35, 131, 226)',
    blueLight: 'rgba(35, 131, 226, 0.15)',
    purple: 'rgb(137, 107, 255)',
    purpleLight: 'rgba(137, 107, 255, 0.15)',
    pink: 'rgb(219, 97, 162)',
    pinkLight: 'rgba(219, 97, 162, 0.15)',
    red: 'rgb(212, 76, 71)',
    redLight: 'rgba(212, 76, 71, 0.15)',
    yellow: 'rgb(203, 145, 47)',
    yellowLight: 'rgba(203, 145, 47, 0.15)',
    green: 'rgb(68, 131, 97)',
    greenLight: 'rgba(68, 131, 97, 0.15)',
    orange: 'rgb(203, 145, 47)',
    orangeLight: 'rgba(203, 145, 47, 0.15)',
  },
  
  // 边框
  border: {
    default: 'rgba(55, 53, 47, 0.16)',
    hover: 'rgba(55, 53, 47, 0.3)',
    strong: 'rgba(55, 53, 47, 0.4)',
  },
  
  // 阴影
  shadow: {
    sm: 'rgba(55, 53, 47, 0.08)',
    md: 'rgba(55, 53, 47, 0.13)',
    lg: 'rgba(55, 53, 47, 0.2)',
  },
};

export const notionTypography = {
  // 字体栈 - 优先使用系统字体
  fontFamily: {
    sans: '"Segoe UI", -apple-system, BlinkMacSystemFont, "SF Pro Text", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
  },
  
  // 字号
  fontSize: {
    xs: '12px',
    sm: '13px',
    md: '14px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },
  
  // 字重
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
  },
  
  // 行高
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const notionSpacing = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
};

export const notionRadii = {
  sm: 3,
  md: 4,
  lg: 6,
  xl: 8,
};

// 状态标签颜色
export const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  todo: { bg: 'rgba(55, 53, 47, 0.08)', text: 'rgb(55, 53, 47)', border: 'rgba(55, 53, 47, 0.15)' },
  in_progress: { bg: 'rgba(35, 131, 226, 0.15)', text: 'rgb(35, 131, 226)', border: 'rgba(35, 131, 226, 0.3)' },
  done: { bg: 'rgba(68, 131, 97, 0.15)', text: 'rgb(68, 131, 97)', border: 'rgba(68, 131, 97, 0.3)' },
  blocked: { bg: 'rgba(212, 76, 71, 0.15)', text: 'rgb(212, 76, 71)', border: 'rgba(212, 76, 71, 0.3)' },
  review: { bg: 'rgba(137, 107, 255, 0.15)', text: 'rgb(137, 107, 255)', border: 'rgba(137, 107, 255, 0.3)' },
};

// 优先级颜色
export const priorityColors: Record<string, { bg: string; text: string }> = {
  high: { bg: 'rgba(212, 76, 71, 0.15)', text: 'rgb(212, 76, 71)' },
  medium: { bg: 'rgba(203, 145, 47, 0.15)', text: 'rgb(203, 145, 47)' },
  low: { bg: 'rgba(68, 131, 97, 0.15)', text: 'rgb(68, 131, 97)' },
};
