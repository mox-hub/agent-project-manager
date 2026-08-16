// Command Palette 模块导出
// 前端模块入口

// Types
export * from './types/command.types';

// Context
export { CommandPaletteProvider, useCommandPalette } from './context/command-palette-context';
export type { CommandPaletteContextValue } from './context/command-palette-context';

// Services
export { commandRegistry, initializeCommandRegistry } from './services/command-registry';
export { presetCommands, aiCommandTemplates, getCommandsByType, getCommandsByGroup } from './services/preset-commands';
export { useAICommandBridge, globalAIBridge } from './services/ai-command-bridge';

// Hooks
export {
  useInitializeCommands,
  useCommands,
  useCommandsByScope,
  useCommandSearch,
  useGroupedCommands,
  useFilteredCommands,
  useAvailableScopes,
  useRegisterCommand,
  useUnregisterCommand,
  useSyncCommandContext,
} from './hooks/use-commands';
export { useShortcutManager, useShortcutBindings } from './hooks/use-shortcut-manager';
export { useCommandExecute } from './hooks/use-command-execute';

// Components
export { EnhancedCommandDialog, CommandPaletteDialog } from './components/command-dialog';
export { CommandItemComponent, CommandEmpty, CommandLoading } from './components/command-item';
export { CommandShortcut, ShortcutDisplay } from './components/command-shortcut';
export { CommandGroupComponent, CommandGroupHeading } from './components/command-group';
export { CommandScopeBar } from './components/command-scope-bar';
export { CommandAIPanel, AICommandSuggestions } from './components/command-ai-panel';
export { CommandInput, CommandInputWithHint } from './components/command-input';
