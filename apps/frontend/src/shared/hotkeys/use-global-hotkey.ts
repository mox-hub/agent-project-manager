import { useEffect, useRef } from 'react';
import { eventToCombo, isEditableTarget } from './hotkey-utils';
import { getEffectiveCombo } from './hotkey-store';

/**
 * 全局快捷键分发 hook——CAP-A-17。消费方（命令面板/AI 面板等壳层动作）以
 * `useGlobalHotkey(id, handler)` 声明动作，模块级单例监听器按注册表当前生效键
 * （用户 override 优先）匹配后 preventDefault 并调用，替代各自手写 keydown。
 *
 * focus 语义：带 mod/alt 修饰的组合键与浏览器级快捷键同语义，输入态不抑制；
 * 无修饰单键在输入框/文本域/contentEditable 聚焦时让位（decision-deck-stack 先例）。
 */

const handlers = new Map<string, () => void>();
let listening = false;

function handleKeyDown(event: KeyboardEvent) {
  const combo = eventToCombo(event);
  if (!combo) return;

  const hasModifier = event.ctrlKey || event.metaKey || event.altKey;
  if (!hasModifier && isEditableTarget(event.target)) return;

  for (const [id, handler] of handlers) {
    if (getEffectiveCombo(id) === combo) {
      event.preventDefault();
      handler();
      return;
    }
  }
}

function ensureListener() {
  if (listening || typeof window === 'undefined') return;
  window.addEventListener('keydown', handleKeyDown);
  listening = true;
}

export function useGlobalHotkey(
  id: string,
  handler: () => void,
  options?: { enabled?: boolean },
): void {
  const enabled = options?.enabled !== false;
  // handler 经 ref 中转，消费方可传内联函数而不触发监听器重建
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;
    handlers.set(id, () => handlerRef.current());
    ensureListener();
    return () => {
      handlers.delete(id);
    };
  }, [id, enabled]);
}
