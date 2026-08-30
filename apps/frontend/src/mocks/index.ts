// mock 模式开关（宪法 §9.3）：仅 dev 且显式 VITE_API_MOCK=on 时启用；
// 生产构建恒为 false，msw 不进入启动路径。
export function isMockModeEnabled(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_API_MOCK === 'on';
}
