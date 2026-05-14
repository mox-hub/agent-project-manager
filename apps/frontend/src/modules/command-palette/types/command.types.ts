// Command Palette 模块类型定义

// ==================== Command Types ====================

/** 命令类型 */
export type CommandType =
  | 'navigation' // 路由导航
  | 'action' // 执行动作
  | 'ai' // AI 操作
  | 'search' // 搜索
  | 'recent' // 最近使用
  | 'setting'; // 设置操作

/** 命令作用域 */
export type CommandScope =
  | 'global' // 全局命令
  | 'project' // 项目内命令
  | 'task' // 任务内命令
  | 'document' // 文档内命令
  | 'terminal'; // 终端命令

/** 命令动作 - 联合类型 */
export type CommandAction =
  | { type: 'navigate'; path: string }
  | { type: 'navigate-params'; path: string; params: Record<string, string> }
  | { type: 'callback'; handler: string; args?: unknown }
  | { type: 'ai-chat'; prompt: string; context?: 'current-project' | 'current-task' | 'current-document' }
  | { type: 'ai-explain'; target: 'selection' | 'file' | 'error' }
  | { type: 'ai-generate'; template: 'commit-message' | 'pr-description' | 'test-case' | 'task-from-doc' }
  | { type: 'open-modal'; modal: string }
  | { type: 'toggle'; target: string }
  | { type: 'create'; entity: 'task' | 'project' | 'document' };

/** 命令执行上下文 */
export interface CommandContext {
  currentProjectId?: string;
  currentProjectName?: string;
  currentTaskId?: string;
  currentDocumentId?: string;
  currentRoute?: string;
  selectedText?: string;
  selectedFiles?: string[];
  user?: {
    id: string;
    name: string;
    email?: string;
  };
}

/** 命令项 */
export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  keywords?: string[]; // 搜索关键词
  icon?: string; // Lucide 图标名
  shortcut?: string[]; // 快捷键，如 ['Ctrl', 'K']
  group: string; // 分组名称
  type: CommandType;
  scope: CommandScope[];

  // 执行相关
  action: CommandAction;

  // 条件显示
  visible?: (context: CommandContext) => boolean;
  enabled?: (context: CommandContext) => boolean;
}

/** 快捷键绑定 */
export interface ShortcutBinding {
  keys: string[]; // ['Ctrl', '/']
  commandId: string;
  scope?: CommandScope[];
  description?: string;
}

// ==================== AI Command Types ====================

/** AI 命令预设模板 */
export interface AICommandTemplate {
  id: string;
  label: string;
  prompt: string;
  context: 'current-project' | 'current-task' | 'current-document' | 'none';
  icon?: string;
}

/** AI 对话结果 */
export interface AICommandResult {
  success: boolean;
  conversationId?: string;
  message?: string;
  error?: string;
}

// ==================== Command Palette State ====================

/** 命令面板状态 */
export interface CommandPaletteState {
  isOpen: boolean;
  query: string;
  selectedScope: CommandScope;
  selectedIndex: number;
}

// ==================== Command Group ====================

/** 分组后的命令 */
export interface CommandGroup {
  name: string;
  commands: CommandItem[];
}

// ==================== Recent Commands ====================

/** 最近执行的命令记录 */
export interface RecentCommand {
  commandId: string;
  executedAt: Date;
  context?: Partial<CommandContext>;
}

// ==================== Command Execution ====================

/** 命令执行结果 */
export interface CommandExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  navigationPath?: string;
  callbackResult?: unknown;
}
