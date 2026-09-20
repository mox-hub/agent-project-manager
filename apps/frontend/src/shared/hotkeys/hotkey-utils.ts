/**
 * 快捷键组合（combo）纯函数工具——CAP-A-17。
 *
 * combo 规范格式：`mod+k`、`alt+a`、`mod+shift+p`。
 * - `mod` = 平台主修饰键（macOS 为 Cmd，其余为 Ctrl），归一化时 ctrl/meta 均收敛为 mod；
 * - 修饰序固定 mod+alt+shift+主键，主键统一小写（字母/数字/功能键）；
 * - 录制未完成（仅按住修饰键、或纯 Shift+字母这类浏览器文本输入行为）返回 null。
 */

const MODIFIER_KEYS = new Set(['Control', 'Meta', 'Alt', 'Shift', 'AltGraph']);

/** 平台主修饰键判定（与 bottom-dock 的 isMac 口径一致） */
export function isMacPlatform(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().includes('MAC')
  );
}

type KeyboardEventLike = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
>;

/** 主键归一化：字母小写、方向键去 Arrow 前缀，其余按原 key 小写 */
function normalizeKey(key: string): string {
  if (key.startsWith('Arrow')) {
    return key.slice(5).toLowerCase();
  }
  if (key === ' ') {
    return 'space';
  }
  return key.toLowerCase();
}

/**
 * 键盘事件 → 规范 combo。录制未完成时返回 null：
 * - 事件本身就是修饰键（等待主键）；
 * - 无 mod/alt 修饰且主键是可打印字符（纯 Shift+字母=文本输入，不作快捷键）。
 */
export function eventToCombo(event: KeyboardEventLike): string | null {
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }

  const hasMod = event.ctrlKey || event.metaKey;
  const hasAlt = event.altKey;
  const hasShift = event.shiftKey;
  const main = normalizeKey(event.key);
  const isPrintable = main.length === 1;

  if (!hasMod && !hasAlt && isPrintable) {
    return null;
  }
  if (!hasMod && !hasAlt && hasShift && isPrintable) {
    return null;
  }

  const parts: string[] = [];
  if (hasMod) parts.push('mod');
  if (hasAlt) parts.push('alt');
  if (hasShift) parts.push('shift');
  parts.push(main);
  return parts.join('+');
}

/** 输入态判定：焦点在文本输入控件时无修饰单键快捷键应让位 */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof (target as HTMLElement).tagName !== 'string') {
    return false;
  }
  const el = target as HTMLElement;
  // jsdom 不实现 isContentEditable getter，attribute 兜底（SSR/旧环境同样鲁棒）
  if (el.isContentEditable || el.getAttribute?.('contenteditable') === 'true') return true;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select';
}

/** combo → 展示键段数组（Kbd 每段一个），如 mod+k → ['Ctrl','K']（非 mac） */
export function formatComboForDisplay(combo: string, isMac = isMacPlatform()): string[] {
  return combo.split('+').map((part) => {
    switch (part) {
      case 'mod':
        return isMac ? '⌘' : 'Ctrl';
      case 'alt':
        return isMac ? '⌥' : 'Alt';
      case 'shift':
        return isMac ? '⇧' : 'Shift';
      case 'space':
        return isMac ? 'Space' : 'Space';
      case 'left':
        return '←';
      case 'right':
        return '→';
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        // 单字符键显示大写，功能键（f5 等）保持原样
        return part.length === 1 ? part.toUpperCase() : part;
    }
  });
}
