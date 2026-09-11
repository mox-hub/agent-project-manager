/**
 * 浮层命中判定 —— 供「点击外部关闭」类交互确定**关闭判定的区域边界**。
 *
 * 背景（2026-09-11 修复）：底部 Dock 的外部点击判定此前只检测 Dock 自身容器，
 * 而 AI 对话浮窗（`fixed bottom-28`）与决策侧栏都在该容器之外，导致：
 *   - 在对话面板内部或其按钮上按下鼠标 → 被误判为「外部点击」→ 连带关闭对话面板；
 *   - 点决策侧栏的「收起」按钮 → 同样被误判 → 主窗口与侧栏一起消失。
 *
 * 规则：**关闭判定只认「AI 协同交互面」之外的区域**。协同交互面 = 底部 Dock
 * ＋ 上方 AI 对话浮窗 ＋ 任意由 Portal 弹出的浮层（弹窗/下拉/选择器等）。
 * 凡落在其中，点击一律不触发关闭；只有面外点击或 ESC 才关闭。
 */

/** Dock 根节点标记（同一交互面，需一并排除） */
export const DOCK_ROOT_ATTR = 'data-dock-root';

/**
 * AI 交互面的就地浮层：对话浮窗本体（assistant-fab）
 * 与局部侵入问答浮层（ai-slot-layer，同为 Portal 到 body 的浮层）
 */
export const ASSISTANT_WINDOW_SELECTOR =
  '[data-ai-component="assistant.fab-window"],[data-ai-component="assistant.inline-slot"]';

/**
 * Portal 弹出的浮层内容：base-ui 的 popup 仅在打开期间挂载，
 * 因此「存在即打开」。切勿在此加入 `[role="dialog"]`——AI 对话浮窗自身
 * 就是 `role="dialog"`，会被误当作内层浮层。
 */
export const PORTAL_LAYER_SELECTOR = [
  '[data-slot="popover-content"]',
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="dropdown-menu-sub-content"]',
  '[data-slot="select-content"]',
  '[data-slot="dialog-content"]',
  '[data-slot="alert-dialog-content"]',
  '[data-slot="sheet-content"]',
  '[data-slot="drawer-content"]',
  '[role="menu"]',
  '[role="listbox"]',
].join(',');

function toElement(target: EventTarget | null): Element | null {
  if (!(target instanceof Node)) return null;
  return target instanceof Element ? target : target.parentElement;
}

/**
 * 事件目标是否落在「AI 协同交互面」内。
 * 落在面内 → 点击不应关闭对话面板 / 收起 Dock 输入栏。
 */
export function isWithinAiCollabSurface(target: EventTarget | null): boolean {
  const el = toElement(target);
  if (!el) return false;
  return Boolean(
    el.closest(`[${DOCK_ROOT_ATTR}]`) ||
      el.closest(ASSISTANT_WINDOW_SELECTOR) ||
      el.closest(PORTAL_LAYER_SELECTOR),
  );
}

/**
 * 是否存在已打开的内层浮层。
 * 用于 ESC 判定：内层浮层（模型选择器/历史菜单/嵌套弹窗等）应先消费 ESC，
 * 不该连带关闭外层 AI 对话面板。
 */
export function hasOpenInnerLayer(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector(PORTAL_LAYER_SELECTOR) !== null;
}
