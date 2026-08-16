// Command Item 组件 - 单个命令项
import React, { useCallback, memo } from 'react';
import { useCommandPalette } from '../context/command-palette-context';
import { useCommandExecute } from '../hooks/use-command-execute';
import type { CommandItem as CommandItemType } from '../types/command.types';
import { CommandShortcut } from './command-shortcut';

// 动态导入 Lucide 图标
import * as Icons from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface CommandItemProps {
  command: CommandItemType;
  isSelected?: boolean;
  onSelect?: () => void;
}

/**
 * 根据图标名称获取图标组件
 */
function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;

  // 使用 unknown 中转来避免类型冲突
  const icons = Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const IconComponent = icons[iconName];
  if (!IconComponent) {
    // 默认图标
    return <Icons.Command className="h-4 w-4" />;
  }

  return <IconComponent className="h-4 w-4" />;
}

export const CommandItemComponent = memo(function CommandItemComponent({
  command,
  isSelected,
  onSelect,
}: CommandItemProps) {
  const { state } = useCommandPalette();
  const { executeCommand } = useCommandExecute();

  const handleSelect = useCallback(() => {
    onSelect?.();
    executeCommand(command);
  }, [command, onSelect, executeCommand]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    },
    [handleSelect]
  );

  // 根据命令类型显示不同的图标
  const getTypeIcon = () => {
    switch (command.type) {
      case 'navigation':
        return <Icons.ArrowRight className="h-3 w-3 text-muted-foreground" />;
      case 'ai':
        return <Icons.Sparkles className="h-3 w-3 text-purple-500" />;
      case 'action':
        return <Icons.Play className="h-3 w-3 text-green-500" />;
      case 'search':
        return <Icons.Search className="h-3 w-3 text-blue-500" />;
      case 'setting':
        return <Icons.Settings className="h-3 w-3 text-orange-500" />;
      default:
        return null;
    }
  };

  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      className={`
        group relative flex cursor-pointer items-center gap-3 px-3 py-2.5
        transition-colors duration-100
        ${isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'}
      `}
      onClick={handleSelect}
      onKeyDown={handleKeyDown}
    >
      {/* 图标 */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground">
        {getIcon(command.icon)}
      </div>

      {/* 标签和描述 */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
        <span className="truncate text-sm font-medium">{command.label}</span>
        {command.description && (
          <span className="truncate text-xs text-muted-foreground">{command.description}</span>
        )}
      </div>

      {/* 类型图标 */}
      <div className="shrink-0">{getTypeIcon()}</div>

      {/* 快捷键 */}
      {command.shortcut && command.shortcut.length > 0 && (
        <CommandShortcut shortcut={command.shortcut} />
      )}

      {/* 选中指示器 */}
      {isSelected && (
        <div className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
      )}
    </div>
  );
});

/**
 * 空状态组件
 */
export function CommandEmpty({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icons.Search className="h-10 w-10 text-muted-foreground/50" />
      <p className="mt-3 text-sm font-medium">未找到命令</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {query ? `没有匹配 "${query}" 的命令` : '尝试输入其他关键词'}
      </p>
    </div>
  );
}

/**
 * 加载状态组件
 */
export function CommandLoading() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
