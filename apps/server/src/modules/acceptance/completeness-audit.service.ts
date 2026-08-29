import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CompletenessChecklistService } from './completeness-checklist.service';

export interface AuditItem {
  type: 'dependency' | 'engineering';
  id: string;
  content: string;
  category?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface AuditResult {
  riskLevel: 'red' | 'yellow' | 'green';
  blockedItems: AuditItem[];
  suggestedItems: AuditItem[];
  passedItems: AuditItem[];
  summary: string;
}

@Injectable()
export class CompletenessAuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checklistService: CompletenessChecklistService,
  ) {}

  /**
   * 执行验收完整性审计
   */
  async auditAcceptance(acceptanceId: string, checklistId?: string) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
      include: {
        task: {
          include: {
            project: true,
            dependencies: {
              include: { dependsOnTask: true },
            },
          },
        },
        criteria: true,
      },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    }

    const result: AuditResult = {
      riskLevel: 'green',
      blockedItems: [],
      suggestedItems: [],
      passedItems: [],
      summary: '',
    };

    // 1. 依赖完备性检查
    const dependencyFindings = await this.checkDependencyCompleteness(
      acceptance.task,
      acceptance.criteria,
    );
    result.blockedItems.push(
      ...dependencyFindings.filter(
        (f) => f.severity === 'critical' || f.severity === 'high',
      ),
    );
    result.suggestedItems.push(
      ...dependencyFindings.filter(
        (f) => f.severity === 'medium' || f.severity === 'low',
      ),
    );

    // 2. 工程完备性检查
    let checklist = null;
    if (checklistId) {
      checklist = await this.checklistService.findOne(checklistId);
    } else if (acceptance.task.project) {
      // 自动选择清单
      const techStack = this.detectTechStack(
        (acceptance.task.project as any)?.metadata,
      );
      checklist = await this.checklistService.findByTechStack(
        this.detectProjectType((acceptance.task.project as any)?.metadata),
        techStack,
      );
    }

    if (checklist) {
      const engineeringFindings = await this.checkEngineeringCompleteness(
        checklist,
        acceptance.criteria,
      );
      result.blockedItems.push(
        ...engineeringFindings.filter(
          (f) => f.severity === 'critical' || f.severity === 'high',
        ),
      );
      result.suggestedItems.push(
        ...engineeringFindings.filter(
          (f) => f.severity === 'medium' || f.severity === 'low',
        ),
      );
    }

    // 3. 已通过项
    const existingCriteria = acceptance.criteria.map((c) => c.content);
    result.passedItems = acceptance.criteria
      .filter((c) => c.status === 'passed')
      .map((c) => ({
        type: 'engineering' as const,
        id: c.id,
        content: c.content,
        category: c.category || undefined,
        severity: (c.severity as any) || 'medium',
        source: c.source,
        autoFixable: false,
      }));

    // 4. 计算风险级别
    if (result.blockedItems.length > 0) {
      result.riskLevel = 'red';
      result.summary = `发现 ${result.blockedItems.length} 个强阻断项，必须补全后才能执行`;
    } else if (result.suggestedItems.length > 0) {
      result.riskLevel = 'yellow';
      result.summary = `建议补全 ${result.suggestedItems.length} 项以提高验收质量`;
    } else {
      result.riskLevel = 'green';
      result.summary = '验收标准完整，可以执行';
    }

    // 5. 保存审计报告
    const report = await this.prisma.completenessAuditReport.upsert({
      where: { acceptanceId },
      create: {
        acceptanceId,
        checklistId: checklist?.id,
        riskLevel: result.riskLevel,
        blockedItems: result.blockedItems as any,
        suggestedItems: result.suggestedItems as any,
        passedItems: result.passedItems as any,
        summary: result.summary,
      },
      update: {
        checklistId: checklist?.id,
        riskLevel: result.riskLevel,
        blockedItems: result.blockedItems as any,
        suggestedItems: result.suggestedItems as any,
        passedItems: result.passedItems as any,
        summary: result.summary,
        auditDate: new Date(),
      },
    });

    return {
      report,
      result,
    };
  }

  /**
   * 依赖完备性检查
   * 扫描 Task 的依赖关系，识别是否有被依赖的 Task 未在验收范围
   */
  private async checkDependencyCompleteness(
    task: any,
    existingCriteria: any[],
  ): Promise<AuditItem[]> {
    const findings: AuditItem[] = [];

    if (!task.dependencies || task.dependencies.length === 0) {
      return findings;
    }

    const criteriaContents = existingCriteria.map((c) =>
      c.content.toLowerCase(),
    );

    for (const dep of task.dependencies) {
      const depTask = dep.dependsOnTask;
      if (!depTask) continue;

      // 检查验收标准中是否提到了被依赖的任务
      const mentionsDep = criteriaContents.some(
        (c) =>
          c.includes(depTask.title.toLowerCase()) || c.includes(depTask.id),
      );

      if (!mentionsDep) {
        const severity = dep.type === 'blocks' ? 'high' : 'medium';
        findings.push({
          type: 'dependency',
          id: `dep-${dep.id}`,
          content: `任务 "${task.title}" 依赖 "${depTask.title}"，但验收标准中未包含相关检查`,
          category: '依赖完备性',
          severity: severity as any,
          source: `Task Dependency: ${dep.type}`,
          suggestion: `添加验收标准：验证与 "${depTask.title}" 的集成`,
          autoFixable: false,
        });
      }
    }

    return findings;
  }

  /**
   * 工程完备性检查
   * 按技术栈清单比对现有验收标准
   */
  private async checkEngineeringCompleteness(
    checklist: any,
    existingCriteria: any[],
  ): Promise<AuditItem[]> {
    const findings: AuditItem[] = [];
    const items = checklist.checklist as any[];
    if (!Array.isArray(items)) return findings;

    const criteriaContents = existingCriteria.map((c) =>
      c.content.toLowerCase(),
    );

    for (const item of items) {
      const contentLower = item.content.toLowerCase();

      // 检查是否已有对应的验收标准
      const hasCriteria = criteriaContents.some(
        (c) => c.includes(contentLower) || contentLower.includes(c),
      );

      if (!hasCriteria) {
        findings.push({
          type: 'engineering',
          id: `eng-${item.category}-${items.indexOf(item)}`,
          content: item.content,
          category: item.category,
          severity: item.severity || 'medium',
          source: `Checklist: ${checklist.name}`,
          suggestion: item.suggestion,
          autoFixable: item.autoFixable || false,
        });
      }
    }

    return findings;
  }

  /**
   * 从项目元数据检测技术栈
   */
  private detectTechStack(metadata: any): string {
    if (!metadata) return 'generic';
    const techStack = metadata.techStack || metadata.tech_stack || '';

    if (techStack.includes('java') || techStack.includes('spring'))
      return 'java-spring';
    if (
      techStack.includes('typescript') &&
      (techStack.includes('node') || techStack.includes('express'))
    )
      return 'ts-node';
    if (techStack.includes('react')) return 'react';
    if (techStack.includes('python') || techStack.includes('django'))
      return 'python-django';
    if (techStack.includes('go') || techStack.includes('gin')) return 'go-gin';

    return techStack || 'generic';
  }

  /**
   * 从项目元数据检测项目类型
   */
  private detectProjectType(metadata: any): string {
    if (!metadata) return 'backend';
    const type = metadata.projectType || metadata.project_type || '';

    if (type.includes('frontend') || type.includes('web')) return 'frontend';
    if (type.includes('mobile')) return 'mobile';
    if (type.includes('library') || type.includes('package')) return 'library';
    if (type.includes('api')) return 'api';

    return 'backend';
  }

  /**
   * 采纳提议项
   */
  async applySuggestions(acceptanceId: string, itemIds: string[]) {
    const acceptance = await this.prisma.acceptance.findUnique({
      where: { id: acceptanceId },
    });

    if (!acceptance) {
      throw new NotFoundException(`Acceptance ${acceptanceId} not found`);
    }

    const report = await this.prisma.completenessAuditReport.findUnique({
      where: { acceptanceId },
    });

    if (!report) {
      throw new NotFoundException('No audit report found');
    }

    const blockedItems = report.blockedItems as any[];
    const suggestedItems = report.suggestedItems as any[];
    const allItems = [...blockedItems, ...suggestedItems];

    const selectedItems = allItems.filter((item) => itemIds.includes(item.id));

    if (selectedItems.length === 0) {
      throw new BadRequestException('No valid items selected');
    }

    // 获取当前最大 order
    const maxOrder = await this.prisma.acceptanceCriteria.aggregate({
      where: { acceptanceId },
      _max: { order: true },
    });

    let orderOffset = (maxOrder._max.order ?? -1) + 1;

    // 批量创建验收标准
    await Promise.all(
      selectedItems.map((item) =>
        this.prisma.acceptanceCriteria.create({
          data: {
            acceptanceId,
            criteriaType: 'technical',
            category: item.category,
            content: item.content,
            source: item.source,
            weight: 1,
            severity: item.severity,
            order: orderOffset++,
            metadata: { fromAudit: true, originalItem: item },
          },
        }),
      ),
    );

    // 重新执行审计
    return this.auditAcceptance(acceptanceId);
  }

  /**
   * 获取审计报告
   */
  async getAuditReport(acceptanceId: string) {
    const report = await this.prisma.completenessAuditReport.findUnique({
      where: { acceptanceId },
      include: {
        acceptance: {
          select: { id: true, taskId: true },
        },
        checklist: {
          select: { id: true, name: true, techStack: true },
        },
      },
    });

    if (!report) {
      return null;
    }

    return report;
  }

  /**
   * 强制审计 Gate（执行前检查）。
   * 以任务"活契约"（非终态最新一条）为准：无活契约不拦（派发时会自动创建）。
   */
  async enforceAuditBeforeExecution(taskId: string): Promise<{
    allowed: boolean;
    report?: any;
    message?: string;
  }> {
    const acceptance = await this.prisma.acceptance.findFirst({
      where: { taskId, status: { notIn: ['passed', 'failed', 'waived'] } },
      include: { auditReport: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!acceptance) {
      return {
        allowed: true,
        message: '该任务暂无活契约，派发时将自动创建',
      };
    }

    if (!acceptance.auditReport) {
      return {
        allowed: false,
        message: '验收契约尚未通过完整性审计',
      };
    }

    if (acceptance.auditReport.riskLevel === 'red') {
      return {
        allowed: false,
        report: acceptance.auditReport,
        message: `存在 ${(acceptance.auditReport.blockedItems as any[]).length} 个强阻断项，必须补全后才能执行`,
      };
    }

    return {
      allowed: true,
      report: acceptance.auditReport,
    };
  }
}
