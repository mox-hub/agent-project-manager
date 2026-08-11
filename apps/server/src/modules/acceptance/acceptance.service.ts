import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { CreateAcceptanceDto, UpdateAcceptanceDto } from './dto/acceptance.dto';
import {
  CompletionType,
  TestReportPayload,
  validateTestReport,
  inferCompletionType,
} from '@/modules/cli-dispatch/adapters/test-report.schema';

@Injectable()
export class AcceptanceService {
  private readonly logger = new Logger(AcceptanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly executionService: ExecutionService,
  ) {}

  /**
   * 创建验收契约
   */
  async create(dto: CreateAcceptanceDto, userId?: string) {
    // 验证 Task 存在
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task ${dto.taskId} not found`);
    }

    const projectId = task.projectId;
    if (!projectId) {
      throw new BadRequestException('Task must be associated with a project');
    }

    // 创建 Acceptance
    const acceptance = await this.prisma.acceptance.create({
      data: {
        taskId: dto.taskId,
        type: dto.type || 'mixed',
        priority: dto.priority || 'medium',
        title: dto.title || `验收 - ${task.title}`,
        description: dto.description,
        createdBy: userId,
        status: 'draft',
      },
      include: {
        task: {
          select: { id: true, title: true },
        },
        criteria: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // 如果提供了验收标准，一并创建
    if (dto.criteria && dto.criteria.length > 0) {
      await this.prisma.acceptanceCriteria.createMany({
        data: dto.criteria.map((c, index) => ({
          acceptanceId: acceptance.id,
          criteriaType: c.criteriaType,
          category: c.category,
          content: c.content,
          source: c.source || 'manual',
          weight: c.weight || 1,
          severity: c.severity || 'medium',
          order: c.order ?? index,
        })),
      });
    }

    // 如果需要自动创建 ExecutionRun
    if (dto.autoCreateExecution) {
      await this.executionService.createExecutionRun({
        projectId,
        taskId: dto.taskId,
        subjectType: 'human',
        subjectId: userId || 'system',
        identitySource: 'api',
        goal: `Acceptance: ${acceptance.title}`,
        createdBy: userId,
        // V3: 建立与 Acceptance 的关联
        acceptanceId: acceptance.id,
      });
    }

    // 重新查询以包含所有关系
    const created = await this.findOne(acceptance.id);
    // 按任务标签推断完成契约类型
    void this.inferAndSetCompletionType(created.id).catch((e) =>
      this.logger.warn(`inferCompletionType failed: ${(e as Error).message}`),
    );
    return created;
  }

  /**
   * 获取单个验收契约
   */
  async findOne(id: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
      include: {
        task: {
          select: { id: true, title: true, status: true },
        },
        criteria: {
          orderBy: { order: 'asc' },
          include: {
            evidences: {
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        executions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            totalCost: true,
            totalTokens: true,
            createdAt: true,
            completedAt: true,
          },
        },
        auditReport: {
          include: {
            checklist: {
              select: { id: true, name: true, techStack: true },
            },
          },
        },
      },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${id} not found`);
    }

    return acceptance;
  }

  /**
   * 查询验收契约列表
   */
  async findAll(params: {
    taskId?: string;
    projectId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { taskId, projectId, status, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (taskId) where.taskId = taskId;
    if (status) where.status = status;

    if (projectId) {
      where.task = { projectId };
    }

    const [data, total] = await Promise.all([
      this.prisma.acceptance.findMany({
        where,
        include: {
          task: {
            select: { id: true, title: true, projectId: true },
          },
          _count: {
            select: { criteria: true, executions: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.acceptance.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 更新验收契约
   */
  async update(id: string, dto: UpdateAcceptanceDto) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${id} not found`);
    }

    // 如果要完成验收
    if (dto.status === 'passed' || dto.status === 'failed') {
      const updateData: { completedAt: Date; [key: string]: unknown } = {
        ...dto,
        completedAt: new Date(),
      };
      return this.prisma.acceptance.update({
        where: { id },
        data: updateData,
      });
    }

    return this.prisma.acceptance.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * 删除验收契约
   */
  async delete(id: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${id} not found`);
    }

    await this.prisma.acceptance.delete({
      where: { id },
    });
  }

  /**
   * 获取任务的所有验收契约
   */
  async findByTask(taskId: string) {
    return this.prisma.acceptance.findMany({
      where: { taskId },
      include: {
        criteria: {
          orderBy: { order: 'asc' },
        },
        auditReport: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 汇总验收成本
   */
  async rollupCost(acceptanceId: string) {
    const executions = await this.prisma.executionRun.findMany({
      where: { acceptanceId },
      select: {
        totalCost: true,
        totalTokens: true,
      },
    });

    const totalCost = executions.reduce(
      (sum, e) => sum + (e.totalCost || 0),
      0,
    );
    const totalTokens = executions.reduce(
      (sum, e) => sum + (e.totalTokens || 0),
      0,
    );

    return this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: { totalCost, totalTokens },
    });
  }

  // ─── V3 阶段1：完成契约 + 接收驳回 ─────────────────────

  /**
   * 按契约类型校验 evidence。返回 checks（每条 true/false + 原因）。
   * - pr: evidence 需含 prUrl + state（merged/open/closed）
   * - test_report: evidence 需含 report，且通过 TestReportPayload schema 校验
   * - document: evidence 需含至少一个 filePath
   * - artifact: evidence 需含 artifactId 或 artifacts 数组
   */
  async validateCompletion(
    acceptanceId: string,
    evidence: Record<string, unknown>,
  ): Promise<{ valid: boolean; checks: { name: string; ok: boolean; reason?: string }[] }> {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });
    if (!acceptance) throw new NotFoundException(`Acceptance ${acceptanceId} not found`);

    const type = (acceptance.completionType || 'artifact') as CompletionType;
    const checks: { name: string; ok: boolean; reason?: string }[] = [];

    switch (type) {
      case 'pr': {
        const prUrl = evidence.prUrl as string | undefined;
        const state = evidence.state as string | undefined;
        checks.push({
          name: 'prUrl',
          ok: !!prUrl && /^https?:\/\/.+/i.test(prUrl),
          reason: prUrl ? undefined : '缺少 PR 链接',
        });
        checks.push({
          name: 'prState',
          ok: state === 'open' || state === 'merged' || state === 'closed',
          reason: state ? undefined : '缺少 PR 状态（open/merged/closed）',
        });
        break;
      }
      case 'test_report': {
        const report = evidence.report as unknown;
        const v = validateTestReport(report);
        if (v.valid) {
          checks.push({ name: 'testReportSchema', ok: true });
        } else {
          checks.push({
            name: 'testReportSchema',
            ok: false,
            reason: `字段缺失: ${v.missing.join(', ')}`,
          });
        }
        // 计算通过率作为额外检查（非阻塞但提示）
        if (v.valid) {
          const r: TestReportPayload = v.report;
          const passedRate = r.total > 0 ? r.passed / r.total : 0;
          const errored = r.errored ?? 0;
          checks.push({
            name: 'passRate',
            ok: r.failed === 0 && errored === 0,
            reason:
              r.failed > 0
                ? `${r.failed} 个用例失败 (通过率 ${(passedRate * 100).toFixed(1)}%)`
                : errored > 0
                  ? `${errored} 个用例环境错误 (通过率 ${(passedRate * 100).toFixed(1)}%)`
                  : undefined,
          });
        }
        break;
      }
      case 'document': {
        const filePaths = (evidence.filePaths as string[] | undefined) ?? [];
        checks.push({
          name: 'filePath',
          ok: Array.isArray(filePaths) && filePaths.length > 0,
          reason: Array.isArray(filePaths) && filePaths.length > 0 ? undefined : '缺少文档产物路径',
        });
        break;
      }
      case 'artifact':
      default: {
        const hasArtifact = !!evidence.artifactId || Array.isArray(evidence.artifacts);
        checks.push({
          name: 'artifactPresent',
          ok: hasArtifact,
          reason: hasArtifact ? undefined : '缺少产物引用',
        });
        break;
      }
    }

    return {
      valid: checks.every((c) => c.ok),
      checks,
    };
  }

  /**
   * 接收完成（passed）。
   * 1. 校验 evidence
   * 2. 写入 completionEvidence + status=passed + completedAt + completedBy
   */
  async acceptCompletion(
    acceptanceId: string,
    evidence: Record<string, unknown>,
    userId?: string,
  ) {
    const v = await this.validateCompletion(acceptanceId, evidence);
    if (!v.valid) {
      throw new BadRequestException({
        code: 'EVIDENCE_INVALID',
        message: '完成证据校验失败',
        checks: v.checks,
      });
    }

    return this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: {
        status: 'passed',
        completionEvidence: evidence as any,
        completedBy: userId,
        completedAt: new Date(),
        rejectionReason: null,
        rejectedAt: null,
      },
    });
  }

  /**
   * 驳回（failed + reason）。
   */
  async rejectCompletion(
    acceptanceId: string,
    reason: string,
    _userId?: string,
  ) {
    const acceptance = await this.prisma.acceptance.findUnique({ where: { id: acceptanceId } });
    if (!acceptance) throw new NotFoundException(`Acceptance ${acceptanceId} not found`);

    return this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: {
        status: 'failed',
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });
  }

  /**
   * 创建 acceptance 时，若未指定 completionType 则根据任务标签自动推断。
   */
  async inferAndSetCompletionType(acceptanceId: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
      include: {
        task: {
          include: { taskTags: { include: { tag: true } } },
        },
      },
    });
    if (!acceptance) throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    if (acceptance.completionType && acceptance.completionType !== 'artifact') return acceptance;

    const tagNames = (acceptance.task?.taskTags ?? []).map((tt) => tt.tag.name);
    const inferred = inferCompletionType({
      type: acceptance.task?.type,
      tags: tagNames,
    });

    return this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: { completionType: inferred },
    });
  }
}
