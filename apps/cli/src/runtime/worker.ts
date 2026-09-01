/**
 * 守护进程执行循环：dispatch → spawn 外部 CLI → events/approval/result 上报
 */
import { ChildProcess } from 'child_process';
import {
  ApmClient,
  ApprovalRequestPayload,
  ApprovalResolvedPayload,
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
  /** 处理控制面审批决议：驳回则终止进程，通过则上报事件继续等待 */
  resolveApproval: (payload: ApprovalResolvedPayload) => boolean;
  running: () => number;
}

export function startWorker(
  api: ApmClient,
  runtimeId: string,
  adapters: Record<string, CliAdapter> = ADAPTERS,
): Worker {
  const runningJobs = new Map<string, RunningJob>();
  // approvalRequestId → executionRunId（决议到达时定位所属执行）
  const pendingApprovals = new Map<string, string>();

  function clearApprovalsFor(executionRunId: string): void {
    for (const [approvalId, runId] of pendingApprovals) {
      if (runId === executionRunId) pendingApprovals.delete(approvalId);
    }
  }

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
    const adapter = adapters[providerId];
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
              .then((res) => {
                const approvalId = (
                  res as { approvalRequestId?: string }
                )?.approvalRequestId;
                if (approvalId) {
                  pendingApprovals.set(approvalId, executionRunId);
                }
              })
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
      clearApprovalsFor(executionRunId);

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
      clearApprovalsFor(executionRunId);
      const message = err instanceof Error ? err.message : String(err);
      await reportResult(executionRunId, 'failed', message, { message });
    }
  }

  function cancel(executionRunId: string): boolean {
    const job = runningJobs.get(executionRunId);
    if (job?.proc) {
      killProcessTree(job.proc);
      runningJobs.delete(executionRunId);
      clearApprovalsFor(executionRunId);
      console.log(`[worker] 已取消 ${executionRunId}`);
      return true;
    }
    return false;
  }

  function resolveApproval(payload: ApprovalResolvedPayload): boolean {
    const executionRunId = pendingApprovals.get(payload.approvalRequestId);
    if (!executionRunId) return false;
    pendingApprovals.delete(payload.approvalRequestId);

    const job = runningJobs.get(executionRunId);
    void api
      .post(RUNTIME_ENDPOINTS.executionEvents(executionRunId), {
        eventType: EXECUTION_EVENT_TYPES.STEP_UPDATED,
        runtimeId,
        status: payload.resolution,
        summary:
          payload.resolution === 'approved'
            ? '审批已通过，继续执行'
            : `审批被驳回${payload.resolutionNote ? `：${payload.resolutionNote}` : ''}`,
      } as ExecutionEventPayload)
      .catch(() => {});

    if (payload.resolution === 'rejected') {
      if (job?.proc) {
        // 终止后走正常退出流程，由 runCliProcess 的非零退出码上报 failed 结果
        killProcessTree(job.proc);
      }
      console.log(`[worker] 审批 ${payload.approvalRequestId} 被驳回，已请求终止 ${executionRunId}`);
    } else {
      console.log(`[worker] 审批 ${payload.approvalRequestId} 已通过，${executionRunId} 继续`);
    }
    return true;
  }

  return { handleDispatch, cancel, resolveApproval, running: () => runningJobs.size };
}
