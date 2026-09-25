import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { ExecutionService } from '@/modules/execution/execution.service';
import { ProposalService } from '@/modules/decision/proposal.service';
import { CreateAcceptanceDto, UpdateAcceptanceDto } from './dto/acceptance.dto';
import { isEvidenceCurrent } from './acceptance-criteria.service';
import { evaluateAuditStaleness } from './completeness-audit.service';
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
    private readonly proposalService: ProposalService,
    private readonly messageBus: MessageBusService,
  ) {}

  /**
   * 创建验收契约
   */
  async create(dto: CreateAcceptanceDto, userId?: string) {
    // 验证 Task 存在
    const task = await this.prisma.issue.findUnique({
      where: { id: dto.issueId },
      include: { project: true, issueTags: { include: { tag: true } } },
    });

    if (!task) {
      throw new NotFoundException(`Task ${dto.issueId} not found`);
    }

    const projectId = task.projectId;
    if (!projectId) {
      throw new BadRequestException('Task must be associated with a project');
    }

    // 同步推断完成契约类型（显式指定优先）
    const completionType =
      dto.completionType ??
      inferCompletionType({
        type: task.type,
        tags: task.issueTags.map((tt) => tt.tag.name),
      });

    // 创建 Acceptance
    const acceptance = await this.prisma.acceptance.create({
      data: {
        issueId: dto.issueId,
        type: dto.type || 'mixed',
        priority: dto.priority || 'medium',
        title: dto.title || `验收 - ${task.title}`,
        description: dto.description,
        completionType,
        createdBy: userId,
        status: 'draft',
      },
      include: {
        issue: {
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
        issueId: dto.issueId,
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
    this.messageBus.publish('acceptance.created', {
      acceptanceId: acceptance.id,
      title: acceptance.title,
      issueId: dto.issueId,
      projectId,
      userId,
    });
    return this.findOne(acceptance.id);
  }

  /**
   * 获取单个验收契约
   */
  async findOne(id: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
      include: {
        issue: {
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
            project: { select: { id: true, name: true } },
          },
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

    // CAP-B-02：详情接口的审计报告附带过期判定（标准修订/新增后 stale=true）
    if (acceptance.auditReport) {
      const staleness = evaluateAuditStaleness(
        (acceptance.auditReport as any).criteriaRevisions,
        acceptance.criteria.map((c) => ({ id: c.id, revision: c.revision })),
      );
      return {
        ...acceptance,
        auditReport: { ...acceptance.auditReport, ...staleness },
      };
    }

    return acceptance;
  }

  /**
   * 查询验收契约列表
   */
  async findAll(params: {
    issueId?: string;
    projectId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { issueId, projectId, status, page = 1, pageSize = 20 } = params;

    const where: any = {};
    if (issueId) where.issueId = issueId;
    if (status) where.status = status;

    if (projectId) {
      where.issue = { projectId };
    }

    const [data, total] = await Promise.all([
      this.prisma.acceptance.findMany({
        where,
        include: {
          issue: {
            select: {
              id: true,
              title: true,
              projectId: true,
              project: { select: { id: true, name: true } },
            },
          },
          // 列表页进度/风险展示所需的最小字段集
          criteria: {
            select: {
              id: true,
              status: true,
              severity: true,
              criteriaType: true,
            },
          },
          auditReport: {
            select: { riskLevel: true },
          },
          _count: {
            select: { executions: true },
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
   * 更新验收契约（元数据与 draft/pending/in_review 间流转）。
   * 终态（passed/failed/waived）禁止经此直写，必须走 accept/reject/waive 专用端点。
   */
  async update(id: string, dto: UpdateAcceptanceDto) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${id} not found`);
    }

    if (dto.status && ['passed', 'failed', 'waived'].includes(dto.status)) {
      throw new BadRequestException({
        code: 'TERMINAL_STATUS_VIA_ENDPOINT',
        message: `终态 status=${dto.status} 只能通过 accept-completion / reject-completion / waive 端点流转`,
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

    const task = acceptance.issueId
      ? await this.prisma.issue.findUnique({
          where: { id: acceptance.issueId },
          select: { projectId: true },
        })
      : null;

    this.messageBus.publish('acceptance.deleted', {
      acceptanceId: id,
      title: acceptance.title,
      issueId: acceptance.issueId,
      projectId: task?.projectId ?? null,
    });
  }

  /**
   * 获取任务的所有验收契约
   */
  async findByTask(issueId: string) {
    return this.prisma.acceptance.findMany({
      where: { issueId },
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
    const executions = await this.prisma.execution.findMany({
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
  ): Promise<{
    valid: boolean;
    checks: { name: string; ok: boolean; reason?: string }[];
  }> {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });
    if (!acceptance)
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);

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
          reason:
            Array.isArray(filePaths) && filePaths.length > 0
              ? undefined
              : '缺少文档产物路径',
        });
        break;
      }
      case 'artifact':
      default: {
        const hasArtifact =
          !!evidence.artifactId || Array.isArray(evidence.artifacts);
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
   * 接收完成（passed）。聚合校验 = 状态门禁 + 完成契约证据 + criteria 判定 + 审计红牌。
   * evidence 可选：传入则校验并作为新快照落库，不传则使用 dispatch 已回写的 completionEvidence。
   */
  async acceptCompletion(
    acceptanceId: string,
    evidence?: Record<string, unknown>,
    userId?: string,
  ) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
      include: {
        criteria: { include: { evidences: true } },
        auditReport: true,
      },
    });
    if (!acceptance)
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);

    const failures: { check: string; reason: string }[] = [];

    // 1. 状态门禁：仅 in_review 可接收
    if (acceptance.status !== 'in_review') {
      failures.push({
        check: 'state',
        reason: `当前状态为 ${acceptance.status}，仅待接收（in_review）状态可执行接收`,
      });
    }

    // 2. 完成契约证据校验（传入优先，否则用已存快照）
    const incoming =
      evidence && Object.keys(evidence).length > 0
        ? evidence
        : ((acceptance.completionEvidence as Record<string, unknown> | null) ??
          {});
    const v = await this.validateCompletion(acceptanceId, incoming);
    for (const c of v.checks.filter((x) => !x.ok)) {
      failures.push({ check: c.name, reason: c.reason || '校验未通过' });
    }

    // pr 契约加严：仅 merged 可接收
    if (acceptance.completionType === 'pr' && incoming.state !== 'merged') {
      failures.push({
        check: 'prMerged',
        reason: `PR 状态为 ${String(incoming.state ?? '未知')}，仅 merged 状态可接收`,
      });
    }

    // 3. criteria 聚合：critical/high 级不得 pending/failed
    const blockingCriteria = acceptance.criteria.filter(
      (c) =>
        (c.severity === 'critical' || c.severity === 'high') &&
        (c.status === 'pending' || c.status === 'failed'),
    );
    for (const c of blockingCriteria) {
      failures.push({
        check: 'criteria',
        reason: `[${c.severity}] ${c.content}`,
      });
    }

    // 3.1 CAP-B-01 证据版本门禁：每条标准至少一条「有效」证据
    // （证据快照 revision = 标准当前 revision；null 快照按初版 1 处理）。
    // 标准修订后旧证据转「待复核」，必须按新版本标准重新提交证据才能接收。
    for (const c of acceptance.criteria) {
      const hasCurrent = (c.evidences ?? []).some((e) =>
        isEvidenceCurrent(e, c.revision),
      );
      if (!hasCurrent) {
        failures.push({
          check: 'criteriaEvidence',
          reason:
            c.revision > 1
              ? `标准已修订至 v${c.revision}，原证据待复核：${c.content}`
              : `标准缺少有效验收证据：${c.content}`,
        });
      }
    }

    // 4. 审计红牌：存在强阻断项不得接收
    if (acceptance.auditReport?.riskLevel === 'red') {
      const blocked = (acceptance.auditReport.blockedItems as unknown[]) ?? [];
      failures.push({
        check: 'audit',
        reason: `完整性审计存在 ${blocked.length} 个强阻断项，补全后重新审计才可接收`,
      });
    }

    if (failures.length > 0) {
      throw new BadRequestException({
        code: 'ACCEPT_BLOCKED',
        message: '接收校验未通过',
        failures,
      });
    }

    return this.prisma.acceptance
      .update({
        where: { id: acceptanceId },
        data: {
          status: 'passed',
          completionEvidence: incoming as any,
          completedBy: userId,
          completedAt: new Date(),
          rejectionReason: null,
          rejectedAt: null,
        },
      })
      .then((updated) => {
        this.messageBus.publish('acceptance.resolved', {
          acceptanceId,
          action: 'accept',
          status: updated.status,
          issueId: acceptance.issueId,
          title: acceptance.title,
          userId,
        });
        // 旁路触发收口提案：任务全部验收通过且未终态 → 提议确认关闭
        void this.proposalService.proposeTaskResolutionIfReady(
          acceptance.issueId,
        );
        return updated;
      });
  }

  /**
   * 驳回（failed + reason）。清除接收残留字段，保留证据快照与驳回记录；
   * 重新派发执行完成后会再次推入 in_review。
   */
  async rejectCompletion(
    acceptanceId: string,
    reason: string,
    _userId?: string,
  ) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });
    if (!acceptance)
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);

    const updated = await this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: {
        status: 'failed',
        rejectionReason: reason,
        rejectedAt: new Date(),
        completedAt: null,
        completedBy: null,
      },
    });

    this.messageBus.publish('acceptance.resolved', {
      acceptanceId,
      action: 'reject',
      status: updated.status,
      issueId: acceptance.issueId,
      title: acceptance.title,
      userId: _userId,
    });
    return updated;
  }

  /**
   * 豁免（waived）：跳过验收直接放行，reason 必填并记录操作人与时间。
   */
  async waiveCompletion(acceptanceId: string, reason: string, userId?: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });
    if (!acceptance)
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);

    if (acceptance.status === 'waived') return acceptance;
    if (['passed', 'failed'].includes(acceptance.status)) {
      throw new BadRequestException(`终态（${acceptance.status}）契约不可豁免`);
    }

    const updated = await this.prisma.acceptance.update({
      where: { id: acceptanceId },
      data: {
        status: 'waived',
        waiverReason: reason,
        waivedBy: userId,
        waivedAt: new Date(),
      },
    });

    this.messageBus.publish('acceptance.resolved', {
      acceptanceId,
      action: 'waive',
      status: updated.status,
      issueId: acceptance.issueId,
      title: acceptance.title,
      userId,
    });
    return updated;
  }

  // ─── 验收标准供给侧（兜底改造批 3，2026-09-15 裁决：先按严格要求）───

  /**
   * 派发前验收门禁：无活契约或活契约 0 条标准均阻断派发。
   * 翻转原「无契约不拦（派发时自动建空契约）」的宽松口径——杜绝
   * 「执行完才发现没标准」的最大返工场景。返回活契约 id。
   */
  async assertDispatchGate(issueId: string): Promise<string> {
    const acceptance = await this.prisma.acceptance.findFirst({
      where: { issueId, status: { notIn: ['passed', 'failed', 'waived'] } },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { criteria: true } } },
    });
    if (!acceptance) {
      throw new BadRequestException(
        '该工单还没有验收契约，暂不可派发执行：请先补全验收标准（可在任务详情页用 AI 代写后确认），再重新派发',
      );
    }
    if (acceptance._count.criteria === 0) {
      throw new BadRequestException(
        '该工单的验收契约还没有任何验收标准，暂不可派发执行：请补全验收标准（可 AI 代写）后重试',
      );
    }
    return acceptance.id;
  }

  /**
   * AI 代写标准落库（人确认后调用）：找/建活契约 → 增量写入。
   * 同 content 去重，绝不覆盖已有标准；source=ai-generated 供审计溯源。
   */
  async applyCriteriaForIssue(
    issueId: string,
    items: Array<{
      content: string;
      criteriaType?: string;
      severity?: string;
      category?: string;
    }>,
    userId?: string,
  ): Promise<{ acceptanceId: string; added: number; skipped: number }> {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      select: { id: true, title: true, projectId: true },
    });
    if (!task) {
      throw new NotFoundException(`Task ${issueId} not found`);
    }

    let acceptance = await this.prisma.acceptance.findFirst({
      where: { issueId, status: { notIn: ['passed', 'failed', 'waived'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!acceptance) {
      acceptance = await this.create({ issueId }, userId);
    }

    const existing = await this.prisma.acceptanceCriteria.findMany({
      where: { acceptanceId: acceptance.id },
      select: { content: true },
    });
    const seen = new Set(existing.map((e) => e.content.trim()));
    // P0-9 同款修复（2026-09-20）：非法项（缺 content）显式 400 拒绝，
    // 不再静默过滤——静默丢项会让「AI 代写 N 条、实际落库 M<N」无声发生。
    // 同 content 去重语义保留（记入 skipped，不重复落库）。
    items.forEach((item, index) => {
      if (!item || typeof item.content !== 'string' || !item.content.trim()) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: `criteria 第 ${index + 1} 项缺少 content 字段`,
          details: { index: index + 1, field: 'content' },
        });
      }
    });
    const toAdd = items.filter((i) => !seen.has(i.content.trim()));
    if (toAdd.length === 0) {
      return { acceptanceId: acceptance.id, added: 0, skipped: items.length };
    }

    await this.prisma.acceptanceCriteria.createMany({
      data: toAdd.map((item, idx) => ({
        acceptanceId: acceptance.id,
        content: item.content.trim(),
        criteriaType:
          item.criteriaType === 'technical' ? 'technical' : 'functional',
        severity: ['critical', 'high', 'medium', 'low'].includes(
          item.severity ?? '',
        )
          ? (item.severity as string)
          : 'medium',
        category: item.category || null,
        source: 'ai-generated',
        order: existing.length + idx,
      })),
    });

    this.messageBus.publish('acceptance.updated', {
      acceptanceId: acceptance.id,
      issueId,
      added: toAdd.length,
      source: 'ai-generated',
      userId,
    });

    return {
      acceptanceId: acceptance.id,
      added: toAdd.length,
      skipped: items.length - toAdd.length,
    };
  }
}
