/**
 * 执行悬挂对账（兜底改造批 2，2026-09-15 裁决）。
 *
 * 此前全 server 无任何定时对账：daemon 崩溃/断网后 in_progress 执行永久
 * 悬挂、pending 派发无 TTL（daemon 恢复后会捡起陈旧任务包执行）、AI 助手
 * 占位消息无限转圈。本服务周期性收敛：
 *
 * 1. expireStalePendingDispatches：pending 派发超 TTL（默认 24h）→ 记录置
 *    expired + 对应 run 收敛为 failed；
 * 2. failStalledRuns：AI 来源 in_progress 执行超阈值（默认 5min，裁决
 *    「缩短默认超时时间」）且归属守护进程心跳离线 → 收敛为 failed；
 *
 * 收敛动作 = 更新派发记录 + messageBus publish runtime.execution.result
 * （failed）——复用既有结果处理链路（dispatch.service 补状态 + failExecution
 * + cliSession、assistant 桥占位原位替换、批 1 失败通知），不另起炉灶。
 *
 * 阈值均可经环境变量覆盖：EXEC_STALL_THRESHOLD_MS / EXEC_PENDING_TTL_MS。
 */
import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { LoggerService } from '@/core/logger/logger.service';
import { RuntimeService } from '@/modules/runtime/runtime.service';
import { WorkflowService } from '@/modules/workflow/workflow.service';

const DEFAULT_STALL_THRESHOLD_MS = 5 * 60_000;
const DEFAULT_PENDING_TTL_MS = 24 * 60 * 60_000;
const RECONCILE_INTERVAL_MS = 120_000;

interface DispatchMetaRow {
  id: string;
  key: string;
  value: {
    executionRunId?: string;
    status?: string;
    runtimeId?: string;
    createdAt?: string;
    [k: string]: unknown;
  };
}

@Injectable()
export class ExecutionReconcileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly logger: LoggerService,
    private readonly runtimeService: RuntimeService,
    private readonly workflowService: WorkflowService,
  ) {
    this.logger.setContext('ExecutionReconcile');
  }

  @Interval(RECONCILE_INTERVAL_MS)
  async reconcile(): Promise<void> {
    try {
      await this.expireStalePendingDispatches();
    } catch (err) {
      this.logger.error(
        'expireStalePendingDispatches failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
    try {
      await this.failStalledRuns();
    } catch (err) {
      this.logger.error(
        'failStalledRuns failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
    try {
      const workflowFixed = await this.workflowService.reconcileStalledRuns();
      if (workflowFixed > 0) {
        this.logger.warn(`Workflow stalled runs reconciled: ${workflowFixed}`);
      }
    } catch (err) {
      this.logger.error(
        'workflow reconcile failed',
        err instanceof Error ? err.stack : String(err),
      );
    }
  }

  /** 扫描派发记录（key = runtime:dispatch:<runtimeId>:<executionRunId>） */
  private async listDispatchMetas(): Promise<DispatchMetaRow[]> {
    const records = await this.prisma.appConfig.findMany({
      where: { key: { startsWith: 'runtime:dispatch:' } },
    });
    return records.map((r) => ({
      id: r.id,
      key: r.key,
      value: r.value as DispatchMetaRow['value'],
    }));
  }

  /** pending 派发超 TTL → expired；关联 run（仍非终态）收敛 failed */
  private async expireStalePendingDispatches(): Promise<void> {
    const ttl =
      Number(process.env.EXEC_PENDING_TTL_MS) || DEFAULT_PENDING_TTL_MS;
    const cutoff = Date.now() - ttl;
    const metas = await this.listDispatchMetas();

    for (const meta of metas) {
      const dispatch = meta.value;
      if (dispatch.status !== 'pending') continue;
      const createdAt = dispatch.createdAt
        ? Date.parse(dispatch.createdAt)
        : NaN;
      if (!Number.isFinite(createdAt) || createdAt > cutoff) continue;

      await this.markDispatchRecord(meta.id, dispatch, 'expired');
      this.logger.log(
        `Dispatch expired (TTL): run=${dispatch.executionRunId} key=${meta.key}`,
      );
      await this.publishStalledResult(
        dispatch.executionRunId,
        'DISPATCH_EXPIRED',
        `派发超过 ${Math.round(ttl / 60_000)} 分钟无人接单，已过期失效`,
      );
    }
  }

  /**
   * AI 来源 in_progress 执行超阈值且归属守护进程离线 → failed。
   * 人工执行项（subjectType=human）不参与对账——人工节奏不归系统裁决。
   */
  private async failStalledRuns(): Promise<void> {
    const threshold =
      Number(process.env.EXEC_STALL_THRESHOLD_MS) || DEFAULT_STALL_THRESHOLD_MS;
    const cutoff = new Date(Date.now() - threshold);
    const stalled = await this.prisma.execution.findMany({
      where: {
        status: 'in_progress',
        subjectType: { not: 'human' },
        updatedAt: { lt: cutoff },
      },
      select: { id: true, goal: true },
    });
    if (stalled.length === 0) return;

    const registrations = await this.runtimeService.listRegistrations();
    const onlineRuntimeIds = new Set(
      registrations
        .filter((r) => r.status === 'online')
        .map((r) => r.runtimeId),
    );
    const metas = await this.listDispatchMetas();
    const runtimeIdByRun = new Map<
      string,
      { meta: DispatchMetaRow; runtimeId: string }
    >();
    for (const meta of metas) {
      const runId = meta.value.executionRunId;
      const runtimeId =
        meta.value.runtimeId ?? this.extractRuntimeIdFromKey(meta.key);
      if (runId && runtimeId) runtimeIdByRun.set(runId, { meta, runtimeId });
    }

    for (const run of stalled) {
      const bound = runtimeIdByRun.get(run.id);
      // 守护进程仍在线 → 可能仍在执行，不误杀
      if (bound && onlineRuntimeIds.has(bound.runtimeId)) continue;

      if (bound) {
        await this.markDispatchRecord(
          bound.meta.id,
          bound.meta.value,
          'failed',
        );
      }
      this.logger.warn(
        `Execution stalled: run=${run.id} goal=${run.goal.slice(0, 50)}`,
      );
      await this.publishStalledResult(
        run.id,
        'EXECUTION_STALLED',
        `执行通道失联超过 ${Math.round(threshold / 60_000)} 分钟，系统已自动标记失败；可在执行中心重新派发`,
      );
    }
  }

  /** 派发记录状态更新（模仿 runtime.service 结果上报路径的写法） */
  private async markDispatchRecord(
    appConfigId: string,
    dispatch: DispatchMetaRow['value'],
    status: string,
  ): Promise<void> {
    await this.prisma.appConfig.update({
      where: { id: appConfigId },
      data: {
        value: {
          ...dispatch,
          status,
          updatedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 悬挂收敛的统一出口：publish runtime.execution.result（failed）。
   * 既有结果链路自动联动——dispatch.service 补 in_progress + failExecution +
   * cliSession 收口、assistant 桥占位消息原位替换为失败态、失败通知触达。
   */
  private async publishStalledResult(
    executionRunId: string | undefined,
    code: string,
    summary: string,
  ): Promise<void> {
    if (!executionRunId) return;
    this.messageBus.publish('runtime.execution.result', {
      executionRunId,
      status: 'failed',
      summary: `${code}: ${summary}`,
      error: { message: summary, code },
      timestamp: new Date().toISOString(),
    });
  }

  /** runtime:dispatch:<runtimeId>:<executionRunId> → runtimeId */
  private extractRuntimeIdFromKey(key: string): string | undefined {
    const parts = key.split(':');
    return parts.length >= 4 ? parts[2] : undefined;
  }
}
