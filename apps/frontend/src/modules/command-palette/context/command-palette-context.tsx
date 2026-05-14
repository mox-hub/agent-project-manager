// Command Palette Provider - 集成到现有系统
import React, { useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useAppStore } from '@/infrastructure/store/app-store';
import { initializeCommandRegistry } from '../services/command-registry';
import type { CommandPaletteState, CommandScope, CommandContext } from '../types/command.types';

interface CommandPaletteContextValue {
  state: CommandPaletteState;
  context: CommandContext;
  open: (initialQuery?: string) => void;
  close: () => void;
  toggle: () => void;
  setQuery: (query: string) => void;
  setScope: (scope: CommandScope) => void;
  setSelectedIndex: (index: number) => void;
  updateContext: (context: Partial<CommandContext>) => void;
}

const defaultState: CommandPaletteState = {
  isOpen: false,
  query: '',
  selectedScope: 'global',
  selectedIndex: 0,
};

const defaultContext: CommandContext = {};

// 创建 Context
import { createContext, useContext, useState } from 'react';

const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(undefined);

interface CommandPaletteProviderProps {
  children: ReactNode;
  initialContext?: Partial<CommandContext>;
}

export function CommandPaletteProvider({ children, initialContext = {} }: CommandPaletteProviderProps) {
  const [state, setState] = useState<CommandPaletteState>(defaultState);
  const [context, setContext] = useState<CommandContext>({ ...defaultContext, ...initialContext });

  // 初始化命令注册表
  useEffect(() => {
    initializeCommandRegistry();
  }, []);

  // 从 App Store 同步上下文 - 使用 useMemo 避免 effect 中 setState
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const currentTaskId = useAppStore((state) => state.currentTaskId);

  const mergedContext = useMemo(() => ({
    ...context,
    currentProjectId,
    currentTaskId,
  }), [context, currentProjectId, currentTaskId]);

  // 注册全局快捷键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+/ 或 Ctrl+K 打开命令面板
      if ((event.ctrlKey || event.metaKey) && (event.key === '/' || event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setState((prev) => ({
          ...prev,
          isOpen: !prev.isOpen,
          query: '',
          selectedIndex: 0,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const open = useCallback((initialQuery?: string) => {
    setState((prev) => ({
      ...prev,
      isOpen: true,
      query: initialQuery ?? '',
      selectedIndex: 0,
    }));
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
      query: '',
      selectedIndex: 0,
    }));
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
      query: prev.isOpen ? '' : prev.query,
      selectedIndex: 0,
    }));
  }, []);

  const setQuery = useCallback((query: string) => {
    setState((prev) => ({
      ...prev,
      query,
      selectedIndex: 0,
    }));
  }, []);

  const setScope = useCallback((scope: CommandScope) => {
    setState((prev) => ({
      ...prev,
      selectedScope: scope,
      selectedIndex: 0,
    }));
  }, []);

  const setSelectedIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: index,
    }));
  }, []);

  const updateContext = useCallback((newContext: Partial<CommandContext>) => {
    setContext((prev) => ({
      ...prev,
      ...newContext,
    }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      context: mergedContext,
      open,
      close,
      toggle,
      setQuery,
      setScope,
      setSelectedIndex,
      updateContext,
    }),
    [state, mergedContext, open, close, toggle, setQuery, setScope, setSelectedIndex, updateContext]
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
}

export type { CommandPaletteContextValue };
