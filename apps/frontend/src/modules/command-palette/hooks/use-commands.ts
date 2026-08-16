// 命令管理 Hooks
import { useMemo, useCallback, useEffect } from 'react';
import { commandRegistry, initializeCommandRegistry } from '../services/command-registry';
import type { CommandItem, CommandScope, CommandContext, CommandGroup } from '../types/command.types';
import { useCommandPalette } from '../context/command-palette-context';

// 初始化标志
let isInitialized = false;

/**
 * 初始化命令注册表
 */
export function useInitializeCommands(): void {
  useEffect(() => {
    if (!isInitialized) {
      initializeCommandRegistry();
      isInitialized = true;
    }
  }, []);
}

/**
 * 获取所有命令
 */
export function useCommands(): CommandItem[] {
  useInitializeCommands();
  return useMemo(() => commandRegistry.getAll(), []);
}

/**
 * 按作用域获取命令
 */
export function useCommandsByScope(scope: CommandScope): CommandItem[] {
  useInitializeCommands();
  return useMemo(() => commandRegistry.getByScope(scope), [scope]);
}

/**
 * 搜索命令
 */
export function useCommandSearch(query: string, scope?: CommandScope): CommandItem[] {
  useInitializeCommands();
  return useMemo(() => commandRegistry.search(query, scope), [query, scope]);
}

/**
 * 获取分组后的命令
 */
export function useGroupedCommands(scope?: CommandScope): CommandGroup[] {
  useInitializeCommands();
  return useMemo(() => {
    const groups = commandRegistry.getGroups();
    return groups
      .map((groupName) => ({
        name: groupName,
        commands: commandRegistry.getByGroup(groupName).filter(
          (cmd) => !scope || cmd.scope.includes(scope)
        ),
      }))
      .filter((group) => group.commands.length > 0);
  }, [scope]);
}

/**
 * 过滤后的命令（根据上下文和搜索词）
 */
export function useFilteredCommands(): {
  filteredCommands: CommandItem[];
  groupedCommands: CommandGroup[];
} {
  useInitializeCommands();
  const { state, context } = useCommandPalette();

  const filteredCommands = useMemo(() => {
    let commands = commandRegistry.getVisibleCommands(context, state.selectedScope);

    // 过滤不可见的命令
    commands = commands.filter((cmd) => {
      if (cmd.visible === undefined) return true;
      return cmd.visible(context);
    });

    // 搜索过滤
    if (state.query.trim()) {
      const lowerQuery = state.query.toLowerCase();
      commands = commands.filter((cmd) => {
        if (cmd.label.toLowerCase().includes(lowerQuery)) return true;
        if (cmd.description?.toLowerCase().includes(lowerQuery)) return true;
        if (cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) return true;
        if (cmd.id.toLowerCase().includes(lowerQuery)) return true;
        return false;
      });
    }

    return commands;
  }, [state.selectedScope, state.query, context]);

  const groupedCommands = useMemo(() => {
    const groups = commandRegistry.getGroups();
    return groups
      .map((groupName) => ({
        name: groupName,
        commands: filteredCommands.filter((cmd) => cmd.group === groupName),
      }))
      .filter((group) => group.commands.length > 0);
  }, [filteredCommands]);

  return { filteredCommands, groupedCommands };
}

/**
 * 获取所有可用作用域
 */
export function useAvailableScopes(): CommandScope[] {
  useInitializeCommands();
  return useMemo(() => commandRegistry.getScopes(), []);
}

/**
 * 注册新命令
 */
export function useRegisterCommand(): (command: CommandItem) => void {
  useInitializeCommands();
  return useCallback((command: CommandItem) => {
    commandRegistry.register(command);
  }, []);
}

/**
 * 注销命令
 */
export function useUnregisterCommand(): (commandId: string) => void {
  return useCallback((commandId: string) => {
    commandRegistry.unregister(commandId);
  }, []);
}

/**
 * 更新命令上下文（同步到 App Store）
 */
export function useSyncCommandContext(): (context: Partial<CommandContext>) => void {
  const { updateContext } = useCommandPalette();

  return useCallback(
    (newContext: Partial<CommandContext>) => {
      updateContext(newContext);
    },
    [updateContext]
  );
}
