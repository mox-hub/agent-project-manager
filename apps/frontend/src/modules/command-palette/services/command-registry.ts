// 命令注册表服务 - Singleton 模式
import type { CommandItem, CommandScope, CommandContext } from '../types/command.types';

/** 命令注册表 */
class CommandRegistry {
  private commands = new Map<string, CommandItem>();
  private scopes = new Set<CommandScope>();

  /**
   * 注册命令
   */
  register(command: CommandItem): void {
    if (this.commands.has(command.id)) {
      console.warn(`[CommandRegistry] Command ${command.id} already registered, skipping.`);
      return;
    }
    this.commands.set(command.id, command);
    command.scope.forEach((s) => this.scopes.add(s));
  }

  /**
   * 批量注册命令
   */
  registerMany(commands: CommandItem[]): void {
    commands.forEach((cmd) => this.register(cmd));
  }

  /**
   * 注销命令
   */
  unregister(commandId: string): boolean {
    return this.commands.delete(commandId);
  }

  /**
   * 获取命令
   */
  get(id: string): CommandItem | undefined {
    return this.commands.get(id);
  }

  /**
   * 获取所有命令
   */
  getAll(): CommandItem[] {
    return Array.from(this.commands.values());
  }

  /**
   * 按作用域获取命令
   */
  getByScope(scope: CommandScope): CommandItem[] {
    return this.getAll().filter((cmd) => cmd.scope.includes(scope));
  }

  /**
   * 按分组获取命令
   */
  getByGroup(group: string): CommandItem[] {
    return this.getAll().filter((cmd) => cmd.group === group);
  }

  /**
   * 获取所有分组名称
   */
  getGroups(): string[] {
    const groups = new Set(this.getAll().map((cmd) => cmd.group));
    return Array.from(groups);
  }

  /**
   * 模糊搜索命令
   */
  search(query: string, scope?: CommandScope): CommandItem[] {
    if (!query.trim()) {
      return scope ? this.getByScope(scope) : this.getAll();
    }

    const lowerQuery = query.toLowerCase();
    const commands = scope ? this.getByScope(scope) : this.getAll();

    return commands
      .filter((cmd) => {
        // 匹配标签
        if (cmd.label.toLowerCase().includes(lowerQuery)) return true;
        // 匹配描述
        if (cmd.description?.toLowerCase().includes(lowerQuery)) return true;
        // 匹配关键词
        if (cmd.keywords?.some((kw) => kw.toLowerCase().includes(lowerQuery))) return true;
        // 匹配 ID
        if (cmd.id.toLowerCase().includes(lowerQuery)) return true;
        return false;
      })
      .sort((a, b) => {
        // 优先匹配标签开头
        const aStarts = a.label.toLowerCase().startsWith(lowerQuery);
        const bStarts = b.label.toLowerCase().startsWith(lowerQuery);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return a.label.localeCompare(b.label);
      });
  }

  /**
   * 根据上下文过滤可见命令
   */
  getVisibleCommands(context: CommandContext, scope?: CommandScope): CommandItem[] {
    let commands = scope ? this.getByScope(scope) : this.getAll();

    // 过滤不可见的命令
    commands = commands.filter((cmd) => {
      if (cmd.visible === undefined) return true;
      return cmd.visible(context);
    });

    return commands;
  }

  /**
   * 根据上下文过滤可用命令
   */
  getEnabledCommands(context: CommandContext): CommandItem[] {
    return this.getVisibleCommands(context).filter((cmd) => {
      if (cmd.enabled === undefined) return true;
      return cmd.enabled(context);
    });
  }

  /**
   * 获取所有作用域
   */
  getScopes(): CommandScope[] {
    return Array.from(this.scopes);
  }

  /**
   * 清空所有命令
   */
  clear(): void {
    this.commands.clear();
    this.scopes.clear();
  }

  /**
   * 获取命令数量
   */
  get size(): number {
    return this.commands.size;
  }
}

// 导出单例
export const commandRegistry = new CommandRegistry();

// 导出初始化函数
export function initializeCommandRegistry(): void {
  // 导入并注册预设命令
  import('./preset-commands').then(({ presetCommands }) => {
    commandRegistry.registerMany(presetCommands);
    console.log(`[CommandRegistry] Initialized with ${presetCommands.length} preset commands.`);
  });
}
