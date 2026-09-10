import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { mkdirSync } from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';
import { Mastra } from '@mastra/core';
import { LibSQLStore } from '@mastra/libsql';
import type { AnyWorkflow, Run } from '@mastra/core/workflows';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { WorkflowCompilerService } from './workflow-compiler.service';
import {
  DEMO_WORKFLOW_DEFINITION,
  DEMO_WORKFLOW_KEY,
} from './workflow-builtin';
import { parseWorkflowDefinition } from './workflow.definition';

/**
 * WorkflowService（CAP-A-11）——持久执行引擎基座。
 *
 * - Mastra + LibSQLStore（本地文件 data/mastra-workflows.db）承担持久执行内核；
 * - AIWorkflowDefinition/AIWorkflowRun 表保留为产品侧真相（定义文法 + run 记账），
 *   引擎 runId 直接复用 AIWorkflowRun.id，天然双写关联；
 * - 进度经 message-bus `ai.workflow.update` → socket.io 广播（EventsGateway 既有订阅）；
 * - 已知边界（基座）：suspended run 的 resume 依赖进程内 Run 句柄，服务重启后
 *   不可恢复（诚实降级为 400 + 重新触发）；跨重启快照恢复留待后续接入 Mastra storage。
 */

/** 引擎侧 run 结果状态 → 产品侧 AIWorkflowRun.status */
const STATUS_MAP = {
  success: 'succeeded',
  failed: 'failed',
  tripwire: 'failed',
  suspended: 'suspended',
  paused: 'suspended',
} as const;

interface EngineResultLike {
  status: keyof typeof STATUS_MAP;
  result?: unknown;
  error?: Error;
  suspendPayload?: unknown;
  suspended?: string[][];
}

@Injectable()
export class WorkflowService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkflowService.name);
  /** 进程内 run 句柄（engine runId = AIWorkflowRun.id） */
  private readonly activeRuns = new Map<
    string,
    Run<any, any, any, any, any, any>
  >();
  private mastra: Mastra | null = null;
  private storage: LibSQLStore | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly compiler: WorkflowCompilerService,
  ) {}

  async onModuleInit() {
    // LibSQL file: 相对进程 cwd（apps/server），data 目录需先存在
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    this.storage = new LibSQLStore({
      id: 'apm-workflow-engine',
      url: 'file:./data/mastra-workflows.db',
    });

    // 内置 demo 定义：upsert 产品侧定义账 + 注册进引擎注册表
    await this.prisma.aIWorkflowDefinition.upsert({
      where: { key: DEMO_WORKFLOW_KEY },
      create: {
        key: DEMO_WORKFLOW_KEY,
        name: '项目简介三步流（内置演示）',
        description:
          'AI 起草项目简介 → 人工确认（暂停等待拍板）→ 确认闸门 → AI 生成验收要点',
        definition:
          DEMO_WORKFLOW_DEFINITION as unknown as Prisma.InputJsonObject,
        createdBy: null,
      },
      update: {},
    });

    this.mastra = new Mastra({
      storage: this.storage,
      workflows: {
        [DEMO_WORKFLOW_KEY]: this.compiler.compile(
          DEMO_WORKFLOW_KEY,
          DEMO_WORKFLOW_DEFINITION,
        ),
      },
    });
    this.logger.log('Workflow engine (Mastra + LibSQL) initialized');
  }

  async onModuleDestroy() {
    this.activeRuns.clear();
    await this.storage?.close?.();
  }

  // ── 定义查询 ──

  async listDefinitions() {
    const workflows = await this.prisma.aIWorkflowDefinition.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return workflows.map((w) => ({
      id: w.id,
      key: w.key,
      name: w.name,
      description: w.description,
      version: w.version,
    }));
  }

  async getDefinition(id: string) {
    const workflow = await this.prisma.aIWorkflowDefinition.findFirst({
      where: { OR: [{ id }, { key: id }] },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    // 定义文法结构校验（编辑过的脏数据在此暴露）；摘要供前端列表/详情直读
    let stepsSummary: Array<Record<string, unknown>> = [];
    try {
      const doc = parseWorkflowDefinition(workflow.definition);
      stepsSummary = doc.steps.map((s) => ({
        id: s.id,
        type: s.type,
        title: s.title,
      }));
    } catch (err) {
      this.logger.warn(
        `Definition ${workflow.key} 文法校验失败：${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return { ...workflow, stepsSummary };
  }

  // ── 触发 / 恢复 ──

  async triggerRun(
    idOrKey: string,
    dto: {
      projectId?: string;
      issueId?: string;
      parameters?: Record<string, unknown>;
      triggerType?: string;
    },
    userId: string,
  ) {
    const definition = await this.prisma.aIWorkflowDefinition.findFirst({
      where: { OR: [{ id: idOrKey }, { key: idOrKey }] },
    });
    if (!definition) throw new NotFoundException('Workflow not found');

    const workflow = this.compileFor(definition.key, definition.definition);

    const run = await this.prisma.aIWorkflowRun.create({
      data: {
        workflowId: definition.id,
        projectId: dto.projectId || null,
        issueId: dto.issueId || null,
        triggerType: dto.triggerType || 'manual',
        status: 'running',
        input: (dto.parameters ?? {}) as Prisma.InputJsonObject,
        stepsState: { engineRunId: null, steps: {} } as Prisma.InputJsonObject,
        startedAt: new Date(),
        createdBy: userId,
      },
    });

    // 引擎 runId 复用产品侧 run id：双写关联天然成立
    const engineRun = await workflow.createRun({ runId: run.id });
    this.activeRuns.set(run.id, engineRun);
    await this.trackStart(run.id, engineRun, dto.parameters ?? {});

    this.publishUpdate(run.id, 'running');
    return { workflowRunId: run.id, status: 'running' };
  }

  async resumeRun(
    runId: string,
    resumeData: Record<string, unknown>,
    _userId: string,
  ) {
    const record = await this.prisma.aIWorkflowRun.findUnique({
      where: { id: runId },
    });
    if (!record) throw new NotFoundException('Workflow run not found');
    if (record.status !== 'suspended') {
      throw new BadRequestException(
        `仅 suspended 状态的运行可恢复（当前：${record.status}）`,
      );
    }
    const engineRun = this.activeRuns.get(runId);
    if (!engineRun) {
      throw new BadRequestException(
        '运行句柄已随服务重启丢失，基座暂不支持跨重启恢复，请重新触发该工作流',
      );
    }

    const stepsState = this.readStepsState(record.stepsState);
    const storedStepId = stepsState.suspendedStepId;
    const suspendedStepId =
      typeof storedStepId === 'string' ? storedStepId : undefined;
    await this.prisma.aIWorkflowRun.update({
      where: { id: runId },
      data: {
        status: 'running',
        stepsState: { ...stepsState, suspendedStepId: null },
      },
    });
    this.publishUpdate(runId, 'running');

    // 异步等待恢复结果（suspend 会再次 resolve suspended；完成/失败由统一回调记账）
    engineRun
      .resume({
        resumeData,
        ...(suspendedStepId ? { step: suspendedStepId } : {}),
      })
      .then((result) => this.settleRun(runId, result as EngineResultLike))
      .catch((err: unknown) => this.failRun(runId, err));

    return { workflowRunId: runId, status: 'running' };
  }

  // ── run 查询 ──

  async listRuns(query: {
    workflowId?: string;
    projectId?: string;
    issueId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = Number(query.page ?? 1);
    const pageSize = Number(query.pageSize ?? 20);
    const where: Record<string, unknown> = {};
    if (query.workflowId) where.workflowId = query.workflowId;
    if (query.projectId) where.projectId = query.projectId;
    if (query.issueId) where.issueId = query.issueId;
    if (query.status) where.status = query.status;

    const [runs, total] = await this.prisma.$transaction([
      this.prisma.aIWorkflowRun.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { workflow: { select: { id: true, key: true, name: true } } },
      }),
      this.prisma.aIWorkflowRun.count({ where }),
    ]);
    return {
      data: runs,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  }

  async getRun(id: string) {
    const run = await this.prisma.aIWorkflowRun.findUnique({
      where: { id },
      include: { workflow: { select: { id: true, key: true, name: true } } },
    });
    if (!run) throw new NotFoundException('Workflow run not found');

    const stepsState = this.readStepsState(run.stepsState);
    let waitingApproval: {
      stepId: string;
      title?: string;
      message: string;
    } | null = null;
    if (run.status === 'suspended' && stepsState.suspendPayload) {
      const payload = stepsState.suspendPayload as {
        stepId?: string;
        title?: string;
        message?: string;
      };
      waitingApproval = {
        stepId: payload.stepId ?? 'unknown',
        ...(payload.title ? { title: payload.title } : {}),
        message: payload.message ?? '',
      };
    }
    return { ...run, waitingApproval };
  }

  // ── 内部 ──

  /** 编译并缓存（key+version 维度；定义更新后版本号变化自动重编译） */
  private compileCache = new Map<
    string,
    { version: number; workflow: AnyWorkflow }
  >();

  private compileFor(key: string, definition: unknown): AnyWorkflow {
    if (this.mastra && key === DEMO_WORKFLOW_KEY) {
      // demo 走引擎注册表（享受 storage 快照路径）
      return this.mastra.getWorkflow(
        DEMO_WORKFLOW_KEY as never,
      ) as unknown as AnyWorkflow;
    }
    return this.compiler.compile(key, definition);
  }

  private async trackStart(
    runId: string,
    engineRun: Run<any, any, any, any, any, any>,
    parameters: Record<string, unknown>,
  ) {
    engineRun
      .start({ inputData: { input: parameters, steps: {} } })
      .then((result) => this.settleRun(runId, result as EngineResultLike))
      .catch((err: unknown) => this.failRun(runId, err));
  }

  private async settleRun(runId: string, result: EngineResultLike) {
    const status = STATUS_MAP[result.status] ?? 'failed';
    if (result.status === 'suspended') {
      const suspendedStepId = result.suspended?.[0]?.[0];
      // suspendPayload 形状为 { [stepId]: payload }，取挂起步骤的负载
      const payloadMap = (result.suspendPayload ?? {}) as Record<
        string,
        unknown
      >;
      const suspendPayload =
        (suspendedStepId ? payloadMap[suspendedStepId] : undefined) ??
        Object.values(payloadMap)[0] ??
        null;
      await this.prisma.aIWorkflowRun.update({
        where: { id: runId },
        data: {
          status,
          stepsState: {
            suspendedStepId,
            suspendPayload,
          } as unknown as Prisma.InputJsonObject,
        },
      });
      this.publishUpdate(runId, status);
      this.logger.log(
        `Workflow run ${runId} suspended at ${suspendedStepId ?? '?'}`,
      );
      return;
    }

    if (status === 'failed') {
      await this.failRun(runId, result.error ?? new Error('workflow failed'));
      return;
    }

    await this.prisma.aIWorkflowRun.update({
      where: { id: runId },
      data: {
        status,
        output: (result.result as Prisma.InputJsonObject) ?? Prisma.JsonNull,
        finishedAt: new Date(),
      },
    });
    this.activeRuns.delete(runId);
    this.publishUpdate(runId, status);
    this.logger.log(`Workflow run ${runId} ${status}`);
  }

  private async failRun(runId: string, err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    await this.prisma.aIWorkflowRun
      .update({
        where: { id: runId },
        data: {
          status: 'failed',
          output: { error: message } as Prisma.InputJsonObject,
          finishedAt: new Date(),
        },
      })
      .catch(() => undefined);
    this.activeRuns.delete(runId);
    this.publishUpdate(runId, 'failed', message);
    this.logger.warn(`Workflow run ${runId} failed: ${message}`);
  }

  private readStepsState(raw: unknown): Record<string, unknown> {
    return raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  }

  private publishUpdate(runId: string, status: string, error?: string) {
    this.messageBus.publish('ai.workflow.update', {
      workflowRunId: runId,
      status,
      ...(error ? { error } : {}),
      at: new Date().toISOString(),
    });
  }
}
