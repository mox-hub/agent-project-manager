// Command Shortcut 显示组件
import React, { memo } from 'react';

interface CommandShortcutProps {
  shortcut: string[];
}

/**
 * 快捷键显示组件
 * 显示类似 ⌘K 或 Ctrl+K 格式的快捷键
 */
export const CommandShortcut = memo(function CommandShortcut({ shortcut }: CommandShortcutProps) {
  // 格式化键名
  const formatKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      Ctrl: '⌃',
      Control: '⌃',
      Alt: '⌥',
      Option: '⌥',
      Shift: '⇧',
      Meta: '⌘',
      Command: '⌘',
      Tab: '⇥',
      Escape: '⎋',
      Enter: '↵',
      Backspace: '⌫',
      Delete: '⌦',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ArrowLeft: '←',
      ArrowRight: '→',
      '/': '/',
      '+': '+',
      '-': '-',
    };

    return keyMap[key] || key;
  };

  return (
    <div className="flex shrink-0 items-center gap-0.5">
      {shortcut.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border/50 bg-muted/50 px-1 text-10 font-medium text-muted-foreground shadow-sm">
            {formatKey(key)}
          </kbd>
          {index < shortcut.length - 1 && (
            <span className="text-muted-foreground/50">+</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
});

/**
 * 快捷键组合显示（用于设置页面）
 */
export function ShortcutDisplay({ shortcut }: CommandShortcutProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/30 px-2 py-1 font-mono text-xs">
      {shortcut.map((key, index) => (
        <React.Fragment key={index}>
          <kbd className="text-muted-foreground">{key}</kbd>
          {index < shortcut.length - 1 && <span className="text-muted-foreground/50">+</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
