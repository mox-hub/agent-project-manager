import { useMemo } from 'react';
import { useExecutionRuns } from '@/modules/executions/api/execution-api';
import type { Task } from '@/modules/issue/api/issue-api';

export interface ActiveAiExecution {
  runId?: string;
  issueId?: string;
  projectId?: string;
  agentName: string;
  status: 'running' | 'pending_approval' | 'blocked';
  stepSummary?: string;
  isExecuting: boolean;
}

const ACTIVE_STATUSES = new Set(['running', 'in_progress', 'pending_approval', 'blocked', 'queued']);

/**
 * useActiveExecutionsMap
 * 集中管理和查询全系统的 AI 活跃执行状态
 */
export function useActiveExecutionsMap() {
  const { data } = useExecutionRuns({ limit: 100 });
  const runs = useMemo(() => data?.runs ?? [], [data?.runs]);

  const { issueMap, projectCounts } = useMemo(() => {
    const issueMap = new Map<string, ActiveAiExecution>();
    const projectCounts = new Map<string, number>();

    for (const run of runs) {
      if (!ACTIVE_STATUSES.has(run.status)) continue;
      // 只有 AI 角色才算 AI 接管态
      if (run.subjectType === 'human') continue;

      const info: ActiveAiExecution = {
        runId: run.id,
        issueId: run.issueId || undefined,
        projectId: run.projectId,
        agentName: run.subjectName || run.role || 'AI Agent',
        status: run.status === 'pending_approval' ? 'pending_approval' : run.status === 'blocked' ? 'blocked' : 'running',
        stepSummary: run.goal || undefined,
        isExecuting: true,
      };

      if (run.issueId) {
        issueMap.set(run.issueId, info);
      }
      if (run.projectId) {
        projectCounts.set(run.projectId, (projectCounts.get(run.projectId) ?? 0) + 1);
      }
    }

    return { issueMap, projectCounts };
  }, [runs]);

  /**
   * 判定某个具体任务是否正处于 AI 执行态
   */
  const getIssueExecution = useMemo(() => {
    return (task: Task | { id: string; assigneeType?: string; status?: string; aiAgent?: { name?: string } | null; projectId?: string | null }): ActiveAiExecution | null => {
      // 1. 优先从运行中执行流查询
      const activeRun = issueMap.get(task.id);
      if (activeRun) return activeRun;

      // 2. 检查任务自身的静态分配（若分配给 AI Agent 且当前处于进行中状态）
      const isAiAssignee = task.assigneeType === 'ai_agent' || !!task.aiAgent;
      const isInProgress = task.status === 'in_progress' || task.status === 'in_review';
      if (isAiAssignee && isInProgress) {
        return {
          issueId: task.id,
          projectId: task.projectId || undefined,
          agentName: task.aiAgent?.name || 'AI Assistant',
          status: 'running',
          stepSummary: 'AI 同事正在执行中',
          isExecuting: true,
        };
      }

      return null;
    };
  }, [issueMap]);

  const getProjectExecutionCount = useMemo(() => {
    return (projectId: string): number => {
      return projectCounts.get(projectId) ?? 0;
    };
  }, [projectCounts]);

  return {
    getIssueExecution,
    getProjectExecutionCount,
    totalActiveAiCount: issueMap.size,
    activeCount: issueMap.size,
  };
}
