import { useEffect, useState, useCallback } from 'react';

/**
 * usePersistentToggle - 按页面键持久化的显隐开关（用于「快捷看板/统计卡片」等可自动隐藏栏目）
 * 状态写入 localStorage，键前缀 `apm.toggle.`，默认隐藏（auto-hidden）。
 */
export function usePersistentToggle(pageKey: string, defaultValue = false) {
  const storageKey = `apm.toggle.${pageKey}`;

  const [value, setValue] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw === null) return defaultValue;
      return raw === '1';
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value ? '1' : '0');
    } catch {
      // ignore quota / privacy errors
    }
  }, [storageKey, value]);

  const toggle = useCallback(() => setValue((v) => !v), []);
  const set = useCallback((next: boolean) => setValue(next), []);

  return { visible: value, toggle, set };
}
