// Command Dialog - 基于现有 cmdk 组件的增强版
import React, { useEffect, useCallback, useRef, useMemo, memo } from 'react';
import * as Icons from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '../context/command-palette-context';
import { useFilteredCommands } from '../hooks/use-commands';
import { useShortcutManager } from '../hooks/use-shortcut-manager';
import { commandRegistry } from '../services/command-registry';
import { CommandScopeBar } from './command-scope-bar';
import { CommandAIPanel } from './command-ai-panel';
import type { CommandScope } from '../types/command.types';

// 使用现有的 cmdk Command 组件
import {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from '@/components/ui/command';

// 动态图标
import * as LucideIcons from 'lucide-react';

interface CommandDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * 获取图标组件
 */
function getIcon(iconName?: string): React.ReactNode {
  if (!iconName) return null;
  // 使用 unknown 中转来避免类型冲突
  const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
  const Icon = icons[iconName];
  return Icon ? <Icon className="h-4 w-4" /> : <LucideIcons.Command className="h-4 w-4" />;
}

/**
 * 获取命令类型图标
 */
function getTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'navigation':
      return <LucideIcons.ArrowRight className="h-3 w-3 text-muted-foreground" />;
    case 'ai':
      return <LucideIcons.Sparkles className="h-3 w-3 text-purple-500" />;
    case 'action':
      return <LucideIcons.Play className="h-3 w-3 text-green-500" />;
    case 'search':
      return <LucideIcons.Search className="h-3 w-3 text-blue-500" />;
    case 'setting':
      return <LucideIcons.Settings className="h-3 w-3 text-orange-500" />;
    default:
      return null;
  }
}

export function EnhancedCommandDialog({ open, onOpenChange }: CommandDialogProps) {
  const navigate = useNavigate();
  const { state, setQuery, setScope, close } = useCommandPalette();
  const { groupedCommands, filteredCommands } = useFilteredCommands();

  // 初始化快捷键管理
  useShortcutManager();

  // 合并外部和内部状态
  const isOpen = open ?? state.isOpen;
  const handleOpenChange = onOpenChange ?? (() => {});

  // 检查是否显示 AI 面板
  const showAIPanel = state.query.startsWith('/ai');

  // 处理命令选择
  const handleSelect = useCallback(
    (commandId: string) => {
      const command = commandRegistry.get(commandId);
      if (!command) return;

      // 根据动作类型执行
      const { action } = command;
      switch (action.type) {
        case 'navigate':
          navigate(action.path);
          break;
        case 'navigate-params': {
          const path = Object.entries(action.params).reduce(
            (acc, [key, value]) => acc.replace(`:${key}`, value),
            action.path
          );
          navigate(path);
          break;
        }
        case 'toggle':
          if (action.target === 'theme') {
            document.documentElement.classList.toggle('dark');
          }
          break;
        case 'create':
          if (action.entity === 'project') {
            navigate('/app/projects');
          } else if (action.entity === 'task') {
            // 导航到任务创建
            const projectId = state.selectedScope === 'project' ? 'current' : undefined;
            navigate(`/app/projects/${projectId}/tasks/new`);
          } else if (action.entity === 'document') {
            navigate('/app/documents');
          }
          break;
        case 'open-modal':
          window.dispatchEvent(new CustomEvent('command:open-modal', { detail: { modal: action.modal } }));
          break;
        case 'ai-chat':
        case 'ai-explain':
        case 'ai-generate':
          // 触发 AI 命令事件
          window.dispatchEvent(
            new CustomEvent('command:ai-command', {
              detail: { action, scope: state.selectedScope },
            })
          );
          break;
      }

      // 关闭面板
      close();
      handleOpenChange(false);
    },
    [navigate, close, handleOpenChange, state.selectedScope]
  );

  // 处理 AI 发送
  const handleAISend = useCallback(
    (prompt: string) => {
      navigate('/app/settings/ai', {
        state: { initialPrompt: prompt, scope: state.selectedScope },
      });
      close();
      handleOpenChange(false);
    },
    [navigate, close, handleOpenChange, state.selectedScope]
  );

  return (
    <CommandDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title="命令面板"
      className="overflow-hidden"
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Icons.Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">命令面板</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <kbd className="rounded border border-border/50 bg-muted/30 px-1.5 py-0.5">
            Esc
          </kbd>
          <span>关闭</span>
        </div>
      </div>

      {/* 作用域切换栏 */}
      <div className="border-b border-border">
        <CommandScopeBar current={state.selectedScope} onChange={setScope} />
      </div>

      {/* 搜索输入框 */}
      <CommandInput
        value={state.query}
        onChange={setQuery}
        placeholder="输入命令或搜索..."
      />

      {/* 命令列表 */}
      <CommandList>
        {groupedCommands.length === 0 ? (
          <CommandEmpty>未找到命令</CommandEmpty>
        ) : (
          groupedCommands.map((group) => (
            <CommandGroup key={group.name} heading={group.name}>
              {group.commands.map((command) => (
                <CommandItem
                  key={command.id}
                  onSelect={() => handleSelect(command.id)}
                >
                  {/* 图标 */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted/50 text-muted-foreground">
                    {getIcon(command.icon)}
                  </span>

                  {/* 标签和描述 */}
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <span className="truncate">{command.label}</span>
                    {command.description && (
                      <span className="truncate text-xs text-muted-foreground">
                        {command.description}
                      </span>
                    )}
                  </div>

                  {/* 类型图标 */}
                  <span className="shrink-0">{getTypeIcon(command.type)}</span>

                  {/* 快捷键 */}
                  {command.shortcut && command.shortcut.length > 0 && (
                    <CommandShortcut>{command.shortcut.join(' ')}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))
        )}
      </CommandList>

      {/* AI 快捷面板 */}
      {showAIPanel && (
        <CommandAIPanel prompt={state.query.slice(4)} onSend={handleAISend} />
      )}

      {/* 底部提示 */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/50 bg-muted/30 px-1">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/50 bg-muted/30 px-1">↵</kbd>
            选择
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-border/50 bg-muted/30 px-1">/</kbd>
            AI 命令
          </span>
        </div>
        <span>{filteredCommands.length} 个命令</span>
      </div>
    </CommandDialog>
  );
}

/**
 * 命令面板包装器（使用 Context 状态）
 */
export function CommandPaletteDialog() {
  const { state, close } = useCommandPalette();

  return (
    <EnhancedCommandDialog
      open={state.isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    />
  );
}
