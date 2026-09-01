/**
 * 守护进程执行循环：dispatch → spawn 外部 CLI → events/approval/result 上报
 */
import { ChildProcess } from 'child_process';
import {
  ApmClient,
  ApprovalRequestPayload,
  CliAdapter,
  ClaudeCodeAdapter,
  CodexAdapter,
  ExecutionEventPayload,
  ExecutionResultPayload,
  EXECUTION_EVENT_TYPES,
  killProcessTree,
  ProviderId,
  runCliProcess,
  RuntimeDispatch,
  RUNTIME_ENDPOINTS,
  ZCodeAdapter,
} from '@apm/shared';

const ADAPTERS: Record<string, CliAdapter> = {
  'claude-code': new ClaudeCodeAdapter(),
  codex: new CodexAdapter(),
  zcode: new ZCodeAdapter(),
};

interface RunningJob {
  proc: ChildProcess;
}

export interface Worker {
  /** 处理单个派发（去重；异步，不阻塞调用方） */
  handleDispatch: (dispatch: RuntimeDispatch) => Promise<void>;
  cancel: (executionRunId: string) => boolean;
  running: () => number;
}

export function startWorker(api: ApmClient, runtimeId: string): Worker {
  const runningJobs = new Map<string, RunningJob>();

  async function reportResult(
    executionRunId: string,
    status: string,
    summary: string,
    error?: Record<string, unknown> | null,
    artifacts?: Array<{ type: string; ref: string }>,
  ): Promise<void> {
    await api
      .post(RUNTIME_ENDPOINTS.executionResult(executionRunId), {
        status,
        summary,
        artifacts: artifacts ?? [],
        error: error ?? null,
      } as ExecutionResultPayload)
      .catch((e) => console.error('[result]', e.message));
  }

  async function handleDispatch(dispatch: RuntimeDispatch): Promise<void> {
    const { executionRunId } = dispatch;
    if (!executionRunId || runningJobs.has(executionRunId)) return;

    const providerId = dispatch.providerId as ProviderId | undefined;
    const prompt = dispatch.prompt;
    const workspaceRoot = dispatch.workspaceRoot;
    if (!providerId || !prompt || !workspaceRoot) {
      await reportResult(
        executionRunId,
        'failed',
        '执行载荷缺失（providerId/prompt/workspaceRoot）',
        { message: '执行载荷缺失' },
      );
      return;
    }
    const adapter = ADAPTERS[providerId];
    if (!adapter) {
      await reportResult(executionRunId, 'failed', `未知 provider: ${providerId}`, {
        message: `未知 provider: ${providerId}`,
      });
      return;
    }

    // token 节流批量上报
    let tokenBuffer = '';
    let tokenFlushTimer: NodeJS.Timeout | null = null;
    const flushTokens = () => {
      if (!tokenBuffer) return;
      const chunk = tokenBuffer;
      tokenBuffer = '';
      api
        .post(RUNTIME_ENDPOINTS.executionEvents(executionRunId), {
          eventType: EXECUTION_EVENT_TYPES.TOKEN,
          runtimeId,
          summary: chunk,
        } as ExecutionEventPayload)
        .catch(() => {});
    };

    let proc: ChildProcess | undefined;
    try {
      await api
        .post(RUNTIME_ENDPOINTS.executionEvents(executionRunId), {
          eventType: EXECUTION_EVENT_TYPES.STARTED,
          runtimeId,
          status: 'running',
          summary: `Provider ${providerId} 已启动执行`,
        } as ExecutionEventPayload)
        .catch(() => {});

      const { proc: p, promise } = runCliProcess(
        adapter,
        {
          workspaceRoot,
          prompt,
          model: dispatch.model,
          allowedTools: dispatch.allowedTools,
          timeout: dispatch.timeout,
        },
        {
          env: {
            APM_EXECUTION_ID: executionRunId,
            APM_PROJECT_ID: dispatch.projectId ?? '',
          },
          onToken: (t) => {
            tokenBuffer += t;
            if (!tokenFlushTimer) {
              tokenFlushTimer = setTimeout(flushTokens, 2000);
            }
          },
          onStep: (step) => {
            api
              .post(RUNTIME_ENDPOINTS.executionEvents(executionRunId), {
                eventType: EXECUTION_EVENT_TYPES.STEP_UPDATED,
                runtimeId,
                stepId: step.name,
                status: step.status,
                summary: step.name,
              } as ExecutionEventPayload)
              .catch(() => {});
          },
          onApprovalNeeded: (req) => {
            api
              .post(RUNTIME_ENDPOINTS.approvalRequest(executionRunId), {
                requestedAction: req.requestedAction,
                riskLevel: req.riskLevel,
                reason: req.reason ?? '',
              } as ApprovalRequestPayload)
              .catch(() => {});
          },
        },
      );
      proc = p;
      runningJobs.set(executionRunId, { proc });

      const res = await promise;
      if (tokenFlushTimer) {
        clearTimeout(tokenFlushTimer);
        flushTokens();
      }
      runningJobs.delete(executionRunId);

      await reportResult(
        executionRunId,
        res.parse.status,
        res.parse.status === 'completed' ? '任务执行完成' : res.parse.error ?? '任务执行失败',
        res.parse.error ? { message: res.parse.error } : null,
        res.parse.artifacts.map((a) => ({
          type: a.type,
          ref: a.storageRef ?? a.name,
        })),
      );
    } catch (err) {
      if (tokenFlushTimer) {
        clearTimeout(tokenFlushTimer);
        flushTokens();
      }
      runningJobs.delete(executionRunId);
      const message = err instanceof Error ? err.message : String(err);
      await reportResult(executionRunId, 'failed', message, { message });
    }
  }

  function cancel(executionRunId: string): boolean {
    const job = runningJobs.get(executionRunId);
    if (job?.proc) {
      killProcessTree(job.proc);
      runningJobs.delete(executionRunId);
      console.log(`[worker] 已取消 ${executionRunId}`);
      return true;
    }
    return false;
  }

  return { handleDispatch, cancel, running: () => runningJobs.size };
}
