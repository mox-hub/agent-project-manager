/**
 * useDebouncedCallback - 通用防抖 hook
 * 在 delay 毫秒内多次调用只触发最后一次。
 *
 * 组件卸载或 delay 变化时自动清理 timer。
 */
import { useEffect, useMemo, useRef } from 'react';

export function useDebouncedCallback<T extends (...args: never[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const fnRef = useRef(fn);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useMemo(
    () =>
      (...args: Parameters<T>) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          fnRef.current(...args);
          timerRef.current = null;
        }, delay);
      },
    [delay],
  );
}