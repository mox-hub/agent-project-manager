// 快捷键管理 Hook
import { useEffect, useCallback, useMemo } from 'react';
import { useCommandPalette } from '../context/command-palette-context';
import { commandRegistry } from '../services/command-registry';
import type { ShortcutBinding } from '../types/command.types';

/**
 * 比较两个快捷键数组是否相等
 */
function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((key, index) => key.toUpperCase() === b[index].toUpperCase());
}

/**
 * 解析按键事件为快捷键数组
 */
function parseKeyEvent(e: KeyboardEvent): string[] {
  const keys: string[] = [];
  if (e.ctrlKey) keys.push('Ctrl');
  if (e.altKey) keys.push('Alt');
  if (e.shiftKey) keys.push('Shift');
  if (e.metaKey) keys.push('Meta');
  keys.push(e.key.toUpperCase());
  return keys;
}

export function useShortcutManager(): void {
  const { open, close, toggle } = useCommandPalette();

  // 预定义的快捷键绑定
  const shortcuts = useMemo<ShortcutBinding[]>(() => {
    const bindings: ShortcutBinding[] = [];

    // 全局快捷键
    bindings.push(
      { keys: ['Ctrl', '/'], commandId: 'toggle.command-palette', description: '打开命令面板' },
      { keys: ['Ctrl', 'K'], commandId: 'toggle.command-palette', description: '打开命令面板' },
      { keys: ['G', 'P'], commandId: 'nav.projects', description: '跳转项目列表' },
      { keys: ['G', 'D'], commandId: 'nav.dashboard', description: '跳转仪表盘' },
      { keys: ['G', 'A'], commandId: 'nav.ai-space', description: '跳转 AI 工作区' },
      { keys: ['G', 'O'], commandId: 'nav.documents', description: '跳转文档' },
      { keys: ['G', 'T'], commandId: 'nav.terminal', description: '跳转终端' },
      { keys: ['G', 'S'], commandId: 'nav.settings', description: '跳转设置' },
      { keys: ['G', 'N'], commandId: 'nav.notifications', description: '跳转通知' },
      { keys: ['T'], commandId: 'settings.toggle-theme', description: '切换主题' }
    );

    return bindings;
  }, []);

  // 执行命令
  const executeCommandById = useCallback(
    (commandId: string) => {
      const command = commandRegistry.get(commandId);
      if (!command) {
        console.warn(`[ShortcutManager] Command not found: ${commandId}`);
        return;
      }

      // 根据命令 ID 执行对应操作
      switch (commandId) {
        case 'toggle.command-palette':
          toggle();
          break;
        case 'settings.toggle-theme':
          // 触发主题切换事件
          window.dispatchEvent(new CustomEvent('command:toggle-theme'));
          break;
        case 'settings.toggle-sidebar':
          // 触发侧边栏切换事件
          window.dispatchEvent(new CustomEvent('command:toggle-sidebar'));
          break;
        default:
          // 触发通用命令执行事件
          window.dispatchEvent(
            new CustomEvent('command:execute', {
              detail: { commandId, command },
            })
          );
      }
    },
    [toggle]
  );

  // 键盘事件处理
  useEffect(() => {
    let lastKeyTime = 0;
    let pendingKeys: string[] = [];
    const KEY_TIMEOUT = 500; // 组合键超时时间

    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果命令面板打开，忽略快捷键处理
      // 命令面板自己会处理键盘事件

      const pressedKeys = parseKeyEvent(e);

      // 跳过纯修饰键按下
      if (['CONTROL', 'ALT', 'SHIFT', 'META'].includes(e.key.toUpperCase())) {
        return;
      }

      // 检查是否是 Ctrl+K 或 Ctrl+/
      if (pressedKeys.includes('Ctrl')) {
        const match = shortcuts.find((s) => arraysEqual(s.keys, pressedKeys));
        if (match) {
          e.preventDefault();
          executeCommandById(match.commandId);
          return;
        }
      }

      // 处理顺序快捷键（如 G P）
      const now = Date.now();
      if (now - lastKeyTime > KEY_TIMEOUT) {
        pendingKeys = [];
      }
      lastKeyTime = now;

      // 检查是否是顺序快捷键
      const currentKey = e.key.toUpperCase();
      if (pendingKeys.length === 0 && ['G', 'T'].includes(currentKey)) {
        pendingKeys.push(currentKey);
        return;
      }

      if (pendingKeys.length === 1) {
        const combo = `${pendingKeys[0]}+${currentKey}`;
        const match = shortcuts.find((s) => {
          const keys = s.keys.map((k) => k.toUpperCase());
          return keys.length === 2 && keys[0] === pendingKeys[0] && keys[1] === currentKey;
        });

        if (match) {
          e.preventDefault();
          executeCommandById(match.commandId);
          pendingKeys = [];
          return;
        }
      }

      // 超时后清空
      if (pendingKeys.length > 0) {
        pendingKeys = [];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, executeCommandById]);

  // 主题切换监听
  useEffect(() => {
    const handleToggleTheme = () => {
      // 这里可以调用主题切换逻辑
      document.documentElement.classList.toggle('dark');
    };

    window.addEventListener('command:toggle-theme', handleToggleTheme);
    return () => window.removeEventListener('command:toggle-theme', handleToggleTheme);
  }, []);

  // 侧边栏切换监听
  useEffect(() => {
    const handleToggleSidebar = () => {
      window.dispatchEvent(new CustomEvent('toggle:sidebar'));
    };

    window.addEventListener('command:toggle-sidebar', handleToggleSidebar);
    return () => window.removeEventListener('command:toggle-sidebar', handleToggleSidebar);
  }, []);
}

/**
 * 获取当前快捷键绑定列表
 */
export function useShortcutBindings(): ShortcutBinding[] {
  return useMemo(() => {
    return commandRegistry.getAll().flatMap((cmd) => {
      if (!cmd.shortcut) return [];
      return [
        {
          keys: cmd.shortcut,
          commandId: cmd.id,
          description: cmd.label,
        },
      ];
    });
  }, []);
}
