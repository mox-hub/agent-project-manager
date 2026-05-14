// 命令执行 Hook
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCommandPalette } from '../context/command-palette-context';
import { commandRegistry } from '../services/command-registry';
import type { CommandItem, CommandAction, CommandExecutionResult, CommandContext } from '../types/command.types';
import { useAppStore } from '@/infrastructure/store/app-store';

export function useCommandExecute() {
  const navigate = useNavigate();
  const { close, context } = useCommandPalette();
  const toggleSidebar = useAppStore((state) => state.sidebarCollapsed);

  /**
   * 执行命令动作
   */
  const executeAction = useCallback(
    async (
      action: CommandAction,
      ctx: CommandContext
    ): Promise<CommandExecutionResult> => {
      switch (action.type) {
        case 'navigate':
          navigate(action.path);
          return { success: true, navigationPath: action.path };

        case 'navigate-params': {
          const path = Object.entries(action.params).reduce(
            (acc, [key, value]) => acc.replace(`:${key}`, value),
            action.path
          );
          navigate(path);
          return { success: true, navigationPath: path };
        }

        case 'callback':
          // 触发回调事件
          window.dispatchEvent(
            new CustomEvent('command:callback', {
              detail: { handler: action.handler, args: action.args },
            })
          );
          return { success: true, callbackResult: action };

        case 'ai-chat':
          // 导航到 AI Space 并发送消息
          navigate('/app/ai', {
            state: {
              initialPrompt: action.prompt,
              context: action.context,
            },
          });
          return { success: true };

        case 'ai-explain':
          // 触发 AI 解释事件
          window.dispatchEvent(
            new CustomEvent('command:ai-explain', {
              detail: { target: action.target, context: ctx },
            })
          );
          return { success: true };

        case 'ai-generate':
          // 触发 AI 生成事件
          window.dispatchEvent(
            new CustomEvent('command:ai-generate', {
              detail: { template: action.template, context: ctx },
            })
          );
          return { success: true };

        case 'open-modal':
          // 触发打开模态框事件
          window.dispatchEvent(
            new CustomEvent('command:open-modal', {
              detail: { modal: action.modal },
            })
          );
          return { success: true };

        case 'toggle':
          if (action.target === 'theme') {
            document.documentElement.classList.toggle('dark');
          } else if (action.target === 'sidebar') {
            window.dispatchEvent(new CustomEvent('toggle:sidebar'));
          }
          return { success: true };

        case 'create':
          if (action.entity === 'project') {
            navigate('/app/projects/new');
          } else if (action.entity === 'task' && ctx.currentProjectId) {
            navigate(`/app/projects/${ctx.currentProjectId}/tasks/new`);
          } else if (action.entity === 'document') {
            navigate('/app/documents/new');
          }
          return { success: true };

        default:
          return {
            success: false,
            error: `Unknown action type: ${(action as CommandAction).type}`,
          };
      }
    },
    [navigate]
  );

  /**
   * 执行命令
   */
  const executeCommand = useCallback(
    async (command: CommandItem): Promise<CommandExecutionResult> => {
      try {
        const result = await executeAction(command.action, context);

        // 执行成功后关闭面板
        if (result.success) {
          close();
        }

        return result;
      } catch (error) {
        console.error('[CommandExecute] Error executing command:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [close, context, executeAction]
  );

  /**
   * 根据 ID 执行命令
   */
  const executeCommandById = useCallback(
    async (commandId: string): Promise<CommandExecutionResult> => {
      const command = commandRegistry.get(commandId);
      if (!command) {
        return {
          success: false,
          error: `Command not found: ${commandId}`,
        };
      }
      return executeCommand(command);
    },
    [executeCommand]
  );

  return {
    executeCommand,
    executeCommandById,
    executeAction,
  };
}
