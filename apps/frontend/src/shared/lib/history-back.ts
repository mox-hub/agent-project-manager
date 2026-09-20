/**
 * 历史回退步数计算 —— 供「从某个全屏子应用一次性跳回进入前的业务页面」使用。
 *
 * 场景（设置页）：`/app/settings/*` 是独立全屏路由，布局组件跨子路由不卸载。
 * 进入设置页会压入一条历史记录（记为 `entryIdx`），此后在设置页内切换左侧导航
 * 还会继续压入更多记录（`entryIdx + 1`、`entryIdx + 2`…）。浏览器历史里的
 * `entryIdx - 1` 才是「进入设置页之前所在的业务页面」。
 *
 * 因此回退步数 = `currentIdx - entryIdx + 1`：
 * 前两项抵消「设置页内部的切换次数」，`+ 1` 才是跨出设置页、回到业务页的那一步。
 *
 * 历史坑（2026-09-11 修复）：此处曾写作 `currentIdx - entryIdx`，**少退一步**——
 * 只要用户在设置页里翻过至少一个分页，返回按钮就会落到上一个设置分页而非业务页。
 *
 * @returns 需要回退的步数（≥1）；无可用业务页历史时返回 `null`，由调用方回落默认页面。
 */
export function resolveBackSteps(currentIdx: number, entryIdx: number): number | null {
  // entryIdx <= 0：本次会话没有更早的业务页记录（如直接打开/刷新在设置页）
  if (entryIdx <= 0) return null;
  // 历史被清空或索引异常（比进入时还靠前）：不可信，交由调用方回落
  if (currentIdx < entryIdx) return null;
  return currentIdx - entryIdx + 1;
}

/** 读取 React Router 写入 `window.history.state` 的索引（缺失或非法时为 0） */
export function readHistoryIdx(): number {
  if (typeof window === 'undefined') return 0;
  const idx = (window.history.state as { idx?: unknown } | null)?.idx;
  return typeof idx === 'number' && Number.isFinite(idx) ? idx : 0;
}
