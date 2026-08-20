// AI 桥接服务 - 连接 Command Palette 与 AI Hub
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/infrastructure/store/app-store';
import type { CommandContext, AICommandResult } from '../types/command.types';

/**
 * AI 命令桥接 Hook
 * 提供 AI 命令的具体实现
 */
export function useAICommandBridge() {
  const navigate = useNavigate();
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const currentTaskId = useAppStore((state) => state.currentTaskId);

  /**
   * 发送 AI 对话消息
   */
  const sendChatMessage = useCallback(
    (message: string, context?: CommandContext): void => {
      // 导航到 AI Space 并触发消息发送
      navigate('/app/settings/ai', {
        state: {
          initialPrompt: message,
          projectId: context?.currentProjectId ?? currentProjectId,
          taskId: context?.currentTaskId ?? currentTaskId,
        },
      });
    },
    [navigate, currentProjectId, currentTaskId]
  );

  /**
   * 分析当前项目
   */
  const analyzeProject = useCallback(
    async (projectId: string): Promise<AICommandResult> => {
      try {
        // 获取项目信息并发送给 AI
        const project = await fetchProjectInfo(projectId);
        if (!project) {
          return { success: false, error: 'Project not found' };
        }

        const prompt = `请分析这个项目的当前状态：

项目名称：${project.name}
项目描述：${project.description || '无'}
项目状态：${project.status}
工作流状态：${project.workflowStatus}
健康状态：${project.healthStatus}
优先级：${project.priority}

请从以下几个方面进行分析：
1. 整体进度评估
2. 关键风险点识别
3. 改进建议`;

        sendChatMessage(prompt, { currentProjectId: projectId });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [sendChatMessage]
  );

  /**
   * 解释选中代码
   */
  const explainCode = useCallback(
    async (code: string, context?: CommandContext): Promise<void> => {
      const prompt = `请详细解释以下代码：

\`\`\`
${code}
\`\`\`

请包含：
1. 代码的整体功能
2. 关键逻辑分析
3. 潜在问题和最佳实践建议`;

      sendChatMessage(prompt, context);
    },
    [sendChatMessage]
  );

  /**
   * 生成 Git 提交信息
   */
  const generateCommitMessage = useCallback(
    async (diff: string, context?: CommandContext): Promise<AICommandResult> => {
      try {
        const prompt = `请根据以下代码变更生成 Git 提交信息：

\`\`\`diff
${diff}
\`\`\`

要求：
1. 遵循 Conventional Commits 规范（格式：type(scope): description）
2. 简洁明了，描述主要变更
3. 如有 breaking changes 请标注`;

        sendChatMessage(prompt, context);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [sendChatMessage]
  );

  /**
   * 生成 PR 描述
   */
  const generatePRDescription = useCallback(
    async (commits: string, context?: CommandContext): Promise<AICommandResult> => {
      try {
        const prompt = `请根据以下提交记录生成 Pull Request 描述：

${commits}

要求：
1. 清晰描述 PR 的目的和主要变更
2. 列出关键变更点
3. 包含测试说明
4. 如有 breaking changes 请标注`;

        sendChatMessage(prompt, context);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [sendChatMessage]
  );

  /**
   * 生成测试用例
   */
  const generateTests = useCallback(
    async (code: string, context?: CommandContext): Promise<AICommandResult> => {
      try {
        const prompt = `请为以下代码生成测试用例：

\`\`\`
${code}
\`\`\`

要求：
1. 使用 Jest 测试框架
2. 覆盖主要功能路径
3. 包含边界条件测试
4. 提供清晰的测试描述`;

        sendChatMessage(prompt, context);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [sendChatMessage]
  );

  /**
   * 从文档提取任务
   */
  const extractTasksFromDocument = useCallback(
    async (content: string, context?: CommandContext): Promise<AICommandResult> => {
      try {
        const prompt = `请分析以下文档内容，提取其中的任务项和行动项：

\`\`\`markdown
${content}
\`\`\`

请以 JSON 格式输出任务列表：
{
  "tasks": [
    {
      "title": "任务标题",
      "description": "任务描述（可选）",
      "priority": "high|medium|low",
      "type": "feature|bug-fix|improvement|docs"
    }
  ]
}`;

        sendChatMessage(prompt, context);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [sendChatMessage]
  );

  /**
   * 审查代码
   */
  const reviewCode = useCallback(
    async (code: string, context?: CommandContext): Promise<AICommandResult> => {
      try {
        const prompt = `请审查以下代码，指出潜在问题和改进建议：

\`\`\`
${code}
\`\`\`

请从以下几个方面评估：
1. 代码质量和可维护性
2. 性能问题
3. 安全风险
4. 最佳实践遵循情况
5. 具体的改进建议`;

        sendChatMessage(prompt, context);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [sendChatMessage]
  );

  return {
    sendChatMessage,
    analyzeProject,
    explainCode,
    generateCommitMessage,
    generatePRDescription,
    generateTests,
    extractTasksFromDocument,
    reviewCode,
  };
}

/**
 * 获取项目信息
 */
async function fetchProjectInfo(projectId: string): Promise<Record<string, unknown> | null> {
  try {
    const response = await fetch(`/_api/projects/${projectId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * 全局 AI 桥接单例
 * 用于在非 React 上下文中触发 AI 命令
 */
export const globalAIBridge = {
  sendChatMessage: (message: string, projectId?: string) => {
    window.dispatchEvent(
      new CustomEvent('command:ai-chat', {
        detail: { prompt: message, projectId },
      })
    );
  },

  analyzeProject: (projectId: string) => {
    window.dispatchEvent(
      new CustomEvent('command:ai-analyze-project', {
        detail: { projectId },
      })
    );
  },
};
