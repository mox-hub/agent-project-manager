import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { DocRegistryService } from '../../document/services/doc-registry.service';
import { MemoryService } from '../../memory/memory.service';
import { classifyExecutionFailure } from '../../execution/failure-classifier';
import {
  buildEnrichmentSection,
  readBudgetFromEnv,
  DEFAULT_CONTEXT_ENRICHMENT_BUDGET_TOKENS,
  type EnrichmentSource,
} from './context-enrichment';

export interface ContextData {
  projectSummary?: string;
  taskDetails?: string;
  recentActivities?: string;
  gitDiff?: string;
  /** 项目知识段（契约与文档知识层 v2 纪要 §9/§11）：Registry catalog + 命中 digest */
  projectKnowledge?: string;
}

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly docRegistry: DocRegistryService,
    private readonly memoryService: MemoryService,
  ) {}

  async buildContext(options: {
    projectId?: string;
    issueId?: string;
    includeProjectSummary?: boolean;
    includeTaskDetails?: boolean;
    includeRecentActivities?: boolean;
    includeGitDiff?: boolean;
    includeProjectKnowledge?: boolean;
  }): Promise<ContextData> {
    const context: ContextData = {};

    if (options.includeProjectSummary && options.projectId) {
      context.projectSummary = await this.getProjectSummary(options.projectId);
    }

    if (options.includeProjectKnowledge && options.projectId) {
      context.projectKnowledge = await this.getProjectKnowledge(
        options.projectId,
      );
    }

    if (options.includeTaskDetails && options.issueId) {
      context.taskDetails = await this.getTaskDetails(options.issueId);
    }

    if (options.includeRecentActivities) {
      if (options.projectId) {
        context.recentActivities = await this.getProjectRecentActivities(
          options.projectId,
        );
      } else if (options.issueId) {
        context.recentActivities = await this.getTaskRecentActivities(
          options.issueId,
        );
      }
    }

    // Git diff will be implemented in Phase 4
    if (options.includeGitDiff) {
      context.gitDiff = 'Git diff integration coming in Phase 4';
    }

    return context;
  }

  private async getProjectSummary(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        _count: {
          select: {
            issues: true,
            iterations: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      return '';
    }

    return `项目名称: ${project.name}
描述: ${project.description || '无'}
类型: ${project.type}
状态: ${project.status}
任务数: ${project._count.issues}
迭代数: ${project._count.iterations}
成员数: ${project._count.members}`;
  }

  /**
   * 项目知识段（契约与文档知识层 v2 纪要 §9 通道 B 的 docs provider）：
   * 从 DocRegistry 取 catalog + ready digest，拼装为紧凑知识清单。
   * 只装元数据/摘要/锚点引用，永不装正文（§11）。
   */
  private async getProjectKnowledge(projectId: string): Promise<string> {
    const catalog = await this.docRegistry.getCatalog(projectId);
    if (catalog.length === 0) return '';

    const topEntries = catalog.slice(0, 20);
    const lines: string[] = ['## 项目知识文档'];
    for (const entry of topEntries) {
      const ref = entry.shortId ? `doc/${entry.shortId}` : entry.docId;
      const role = entry.docRole ? ` [${entry.docRole}]` : '';
      lines.push(
        `- ${entry.title}${role} (${ref}, ${entry.status}${
          entry.folderPath ? `, ${entry.folderPath}` : ''
        })`,
      );

      if (entry.digestPolicy === 'off') continue;
      const subset = await this.docRegistry.getSubset(entry.docId);
      if (subset?.digest?.summary) {
        lines.push(`  摘要: ${subset.digest.summary}`);
      }
    }
    if (catalog.length > topEntries.length) {
      lines.push(`（其余 ${catalog.length - topEntries.length} 篇见文档目录）`);
    }
    return lines.join('\n');
  }

  private async getTaskDetails(issueId: string): Promise<string> {
    const task = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        issueTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!task) {
      return '';
    }

    const tags = task.issueTags.map((tt) => tt.tag.name).join(', ');

    return `任务标题: ${task.title}
描述: ${task.description || '无'}
状态: ${task.status}
优先级: ${task.priority}
负责人: ${task.assignee?.displayName || '未分配'}
报告人: ${task.reporter?.displayName || '未知'}
标签: ${tags || '无'}
截止日期: ${task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '无'}`;
  }

  private async getProjectRecentActivities(
    projectId: string,
    limit = 10,
  ): Promise<string> {
    const activities = await this.prisma.issueActivity.findMany({
      where: { projectId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        issue: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (activities.length === 0) {
      return '暂无最近活动';
    }

    return activities
      .map(
        (act) =>
          `[${new Date(act.timestamp).toLocaleString()}] ${act.type}: ${
            act.summary || ''
          } (任务: ${act.issue.title})`,
      )
      .join('\n');
  }

  private async getTaskRecentActivities(
    issueId: string,
    limit = 10,
  ): Promise<string> {
    const activities = await this.prisma.issueActivity.findMany({
      where: { issueId },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    if (activities.length === 0) {
      return '暂无最近活动';
    }

    return activities
      .map(
        (act) =>
          `[${new Date(act.timestamp).toLocaleString()}] ${act.type}: ${
            act.summary || ''
          }`,
      )
      .join('\n');
  }

  formatContextForPrompt(context: ContextData): string {
    const parts: string[] = [];

    if (context.projectSummary) {
      parts.push('## 项目信息\n' + context.projectSummary);
    }

    if (context.taskDetails) {
      parts.push('## 任务信息\n' + context.taskDetails);
    }

    if (context.recentActivities) {
      parts.push('## 最近活动\n' + context.recentActivities);
    }

    if (context.gitDiff) {
      parts.push('## Git 变更\n' + context.gitDiff);
    }

    return parts.length > 0
      ? '以下是与本次对话相关的上下文信息：\n\n' + parts.join('\n\n')
      : '';
  }

  /**
   * Build a structured task execution context enriched with ProjectAIContext data.
   * Used by AI Worker Coordinator for dispatch context packs.
   */
  async buildTaskExecutionContext(issueId: string, projectId: string) {
    const [task, aiContext] = await Promise.all([
      this.prisma.issue.findUnique({
        where: { id: issueId },
        include: {
          assignee: {
            select: { id: true, username: true, displayName: true },
          },
          reporter: {
            select: { id: true, username: true, displayName: true },
          },
          issueTags: { include: { tag: true } },
          dependencies: {
            include: {
              dependsOnIssue: {
                select: { id: true, title: true, status: true },
              },
            },
          },
          subIssues: {
            select: { id: true, title: true, status: true },
          },
          // V3: 包含验收契约
          acceptances: {
            include: {
              criteria: {
                orderBy: { order: 'asc' },
              },
              auditReport: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      this.prisma.projectAIContext.findUnique({
        where: { projectId },
      }),
    ]);

    if (!task) {
      return null;
    }

    // V3: 获取最新的 Acceptance
    const acceptance = task.acceptances[0] || null;

    // P2-23：派发上下文富化（文档摘要 / 记忆原子 / 历史教训），受 token 预算
    // 约束；单来源拉取失败诚实跳过（不造假），全空时 enrichment 为 null
    //（不注空段）。
    const enrichment = await this.buildEnrichment(projectId);

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        tags: task.issueTags.map((tt) => tt.tag.name),
        assignee: task.assignee?.displayName ?? null,
        dependencies: task.dependencies.map((d) => ({
          id: d.dependsOnIssue.id,
          title: d.dependsOnIssue.title,
          status: d.dependsOnIssue.status,
        })),
        subIssues: task.subIssues,
      },
      // V3: 注入验收标准
      acceptance: acceptance ? this.formatAcceptanceContext(acceptance) : null,
      projectContext: aiContext
        ? {
            techStack: aiContext.techStack as string[] | null,
            languages: aiContext.languages as string[] | null,
            frameworks: aiContext.frameworks as string[] | null,
            complexityLevel: aiContext.complexityLevel,
            lifecyclePhase: aiContext.lifecyclePhase,
            healthScore: aiContext.healthScore,
            riskIndicators: aiContext.riskIndicators as Record<
              string,
              unknown
            > | null,
          }
        : null,
      enrichment,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * P2-23 上下文富化：项目文档摘要（Registry catalog + digest）、记忆原子
   * （recall 项目域 + global）、历史教训（同项目最近 failed/blocked 执行的
   * 机械归类 + 人话 hint）。三来源并行拉取、单来源失败跳过不炸派发；
   * 拼装后经 token 预算器贪心装入（优先级 docs > memories > lessons），
   * 超限截断并在 enrichment.truncated 如实标注。
   */
  private async buildEnrichment(projectId: string) {
    const budgetTokens = readBudgetFromEnv(
      'CONTEXT_ENRICHMENT_BUDGET_TOKENS',
      DEFAULT_CONTEXT_ENRICHMENT_BUDGET_TOKENS,
    );

    const [docs, memories, lessons] = await Promise.all([
      this.loadDocsSource(projectId),
      this.loadMemoriesSource(projectId),
      this.loadLessonsSource(projectId),
    ]);

    const sources: EnrichmentSource[] = [];
    if (docs)
      sources.push({
        key: 'docs',
        title: '## 项目知识文档',
        text: docs,
        priority: 1,
      });
    if (memories)
      sources.push({
        key: 'memories',
        title: '## 项目记忆',
        text: memories,
        priority: 2,
      });
    if (lessons)
      sources.push({
        key: 'lessons',
        title: '## 历史教训',
        text: lessons,
        priority: 3,
      });

    if (sources.length === 0) return null;

    const section = buildEnrichmentSection(sources, budgetTokens);
    if (!section.text) return null;

    return {
      text: section.text,
      included: section.included,
      truncated: section.truncated,
      budgetTokens: section.budgetTokens,
      usedTokens: section.usedTokens,
    };
  }

  /** 文档摘要来源：复用 docs provider 的 catalog+digest 拼装（标题+摘要级，永不装正文） */
  private async loadDocsSource(projectId: string): Promise<string> {
    try {
      return await this.getProjectKnowledge(projectId);
    } catch (e) {
      this.logger.warn(
        `enrichment docs source failed for project ${projectId}: ${(e as Error).message}`,
      );
      return '';
    }
  }

  /** 记忆原子来源：recall 项目域（可带 global 共享档），取 pinned/置信度优先的前若干条 */
  private async loadMemoriesSource(projectId: string): Promise<string> {
    try {
      const atoms = await this.memoryService.recall({
        projectId,
        limit: 8,
      });
      if (atoms.length === 0) return '';
      return atoms
        .map((a) => {
          const slot = (a as { slot?: string | null }).slot;
          const label = slot || a.type;
          return `- [${label}] ${a.content}`;
        })
        .join('\n');
    } catch (e) {
      this.logger.warn(
        `enrichment memories source failed for project ${projectId}: ${(e as Error).message}`,
      );
      return '';
    }
  }

  /** 历史教训来源：同项目最近 failed/blocked 执行 → 机械归类 + 人话 hint（存量纯函数，零 token） */
  private async loadLessonsSource(projectId: string): Promise<string> {
    try {
      const failedRuns = await this.prisma.execution.findMany({
        where: { projectId, status: { in: ['failed', 'blocked'] } },
        select: {
          goal: true,
          title: true,
          status: true,
          errorDetail: true,
          input: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      });
      const lines: string[] = [];
      for (const run of failedRuns) {
        const classification = classifyExecutionFailure({
          errorDetail: run.errorDetail,
          input: run.input,
        });
        if (!classification) continue;
        lines.push(
          `- 「${run.title || run.goal}」（${classification.category}）：${classification.hint}`,
        );
      }
      return lines.join('\n');
    } catch (e) {
      this.logger.warn(
        `enrichment lessons source failed for project ${projectId}: ${(e as Error).message}`,
      );
      return '';
    }
  }

  /**
   * V3: 格式化验收契约上下文
   */
  private formatAcceptanceContext(acceptance: any) {
    const functionalCriteria = acceptance.criteria
      .filter((c: any) => c.criteriaType === 'functional')
      .map((c: any) => ({
        content: c.content,
        status: c.status,
        category: c.category,
      }));

    const technicalCriteria = acceptance.criteria
      .filter((c: any) => c.criteriaType === 'technical')
      .map((c: any) => ({
        content: c.content,
        status: c.status,
        category: c.category,
        severity: c.severity,
      }));

    return {
      id: acceptance.id,
      status: acceptance.status,
      type: acceptance.type,
      functionalCriteria,
      technicalCriteria,
      auditReport: acceptance.auditReport
        ? {
            riskLevel: acceptance.auditReport.riskLevel,
            blockedItems: acceptance.auditReport.blockedItems,
            suggestedItems: acceptance.auditReport.suggestedItems,
            summary: acceptance.auditReport.summary,
          }
        : null,
    };
  }
}
