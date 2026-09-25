import { useEffect } from 'react';
import { invoke, isDesktopShellAvailable } from '@/shared/types/electron-api';

/**
 * 登录态紧凑窗口（CAP-A-14 切片）：桌面壳在认证面期间把主窗口收缩为
 * 包住认证卡片的紧凑小窗并隐藏标题栏，离开认证面自动恢复。
 *
 * 仅限认证面壳组件（AuthVisualCard / AuthShell）挂载：挂载即进入紧凑态、
 * 卸载即恢复。web 端（无壳桥）与旧壳版本（未知命令）静默降级零影响。
 */
export function useDesktopCompactWindow(): void {
  useEffect(() => {
    if (!isDesktopShellAvailable()) {
      return undefined;
    }
    void invoke('set_compact_mode', { enabled: true }).catch(() => undefined);
    return () => {
      void invoke('set_compact_mode', { enabled: false }).catch(() => undefined);
    };
  }, []);
}
