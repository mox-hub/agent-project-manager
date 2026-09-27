/**
 * Prompt Service（CAP-A-24）
 *
 * 提示词治理 REST 面：系统提示词只读查看 + 注入开关 + 项目级提示词。
 * 派发面（CliDispatchService）直接复用 prompt-shared 纯函数层，不经本服务。
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import type { SystemPromptDetail, SystemPromptMeta } from './prompt-templates';
import { BUILTIN_PROMPT_TEMPLATES } from './prompt-templates';
import type {
  PromptInjectionToggles,
  PromptSectionUsage,
  PromptTemplateFacts,
} from './prompt-shared';
import {
  PROMPT_SECTION_MARKERS,
  buildTaskPromptFacts,
  collectPromptVariables,
  getSystemPromptDetail,
  interpolatePromptTemplate,
  listSystemPromptMetas,
  parsePromptSections,
  readProjectPrompt,
  readPromptInjectionToggles,
  writeProjectPrompt,
  writePromptInjectionToggles,
} from './prompt-shared';
import { PromptAgentsSyncService } from './prompt-agents-sync.service';

/** 注入率统计采样上限（防历史表过大拖垮端点） */
const USAGE_STATS_MAX_SAMPLE = 100;

/** 模板列表条目（内置常量与表记录的统一形状） */
export interface PromptTemplateItem {
  id: string;
  name: string;
  description: string;
  target: string;
  scope: string;
  projectId: string | null;
  body: string;
  builtIn: boolean;
  /** 正文中的插值变量（编辑器提示与选用预览用） */
  variables: string[];
}

/** AGENTS.md 文件侧状态（config 响应的 agentsFile 字段） */
export interface AgentsFileStatus {
  /** AGENTS.md 是否存在于项目工作区 */
  fileExists: boolean;
  /** 文件侧受管区块当前内容（缺失为 null） */
  blockContent: string | null;
  /** 文件侧内容与 AppConfig 提示词不一致（以文件为准回填走人确认） */
  drifted: boolean;
}

@Injectable()
export class PromptService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentsSync: PromptAgentsSyncService,
  ) {}

  listSystemPrompts(): SystemPromptMeta[] {
    return listSystemPromptMetas();
  }

  getSystemPrompt(key: string): SystemPromptDetail {
    const detail = getSystemPromptDetail(key);
    if (!detail) {
      throw new NotFoundException(`System prompt ${key} not found`);
    }
    return detail;
  }

  /** AGENTS.md 文件侧状态（config 响应的 agentsFile 字段） */
  async getConfig(projectId?: string): Promise<{
    toggles: PromptInjectionToggles;
    projectPrompt: string | null;
    agentsFile: AgentsFileStatus | null;
  }> {
    const toggles = await readPromptInjectionToggles(this.prisma);
    const projectPrompt = projectId
      ? await readProjectPrompt(this.prisma, projectId)
      : null;
    let agentsFile: AgentsFileStatus | null = null;
    if (projectId) {
      const read = await this.agentsSync.readBlock(projectId);
      const normalized = projectPrompt?.trim() ?? null;
      agentsFile = {
        fileExists: read.fileExists,
        blockContent: read.blockContent,
        drifted:
          read.blockContent !== null &&
          normalized !== null &&
          read.blockContent !== normalized,
      };
    }
    return { toggles, projectPrompt, agentsFile };
  }

  async updateConfig(partial: {
    toggles: Partial<PromptInjectionToggles>;
    projectId?: string;
    projectPrompt?: string;
  }): Promise<{
    toggles: PromptInjectionToggles;
    projectPrompt: string | null;
    agentsSync: { synced: boolean; reason: string | null } | null;
  }> {
    const toggles = await writePromptInjectionToggles(
      this.prisma,
      partial.toggles,
    );
    let projectPrompt: string | null = null;
    let agentsSync: { synced: boolean; reason: string | null } | null = null;
    if (partial.projectId) {
      if (typeof partial.projectPrompt === 'string') {
        projectPrompt = await writeProjectPrompt(
          this.prisma,
          partial.projectId,
          partial.projectPrompt,
        );
        // 物化到 AGENTS.md 受管区块（D）：无工作区/IO 失败降级为未同步，
        // 不阻断提示词保存——真相源 AppConfig 已落。
        const result = await this.agentsSync.materialize(
          partial.projectId,
          projectPrompt,
        );
        agentsSync = { synced: result.synced, reason: result.reason };
      } else {
        projectPrompt = await readProjectPrompt(this.prisma, partial.projectId);
      }
    }
    return { toggles, projectPrompt, agentsSync };
  }

  /* ---------------------------------------------------------------- */
  /* 提示词模板库（增强 A）：内置常量 + PromptTemplate 表合并呈现        */
  /* ---------------------------------------------------------------- */

  /** 模板列表（内置在前；target/scope+projectId 过滤） */
  async listTemplates(
    target?: string,
    scope?: string,
    projectId?: string,
  ): Promise<PromptTemplateItem[]> {
    const builtins: PromptTemplateItem[] = BUILTIN_PROMPT_TEMPLATES.filter(
      (t) => !target || t.target === target,
    ).map((t) => ({
      id: t.key,
      name: t.name,
      description: t.description,
      target: t.target,
      scope: 'workspace',
      projectId: null,
      body: t.body,
      builtIn: true,
      variables: collectPromptVariables(t.body),
    }));

    const rows = await this.prisma.promptTemplate.findMany({
      where: {
        ...(target ? { target } : {}),
        ...(scope === 'project' && projectId
          ? { scope, projectId }
          : scope === 'workspace'
            ? { scope }
            : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    return [
      ...builtins,
      ...rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? '',
        target: row.target,
        scope: row.scope,
        projectId: row.projectId,
        body: row.body,
        builtIn: false,
        variables: collectPromptVariables(row.body),
      })),
    ];
  }

  async createTemplate(input: {
    name: string;
    description?: string;
    target: string;
    scope: string;
    projectId?: string;
    body: string;
    createdBy?: string;
  }): Promise<PromptTemplateItem> {
    const row = await this.prisma.promptTemplate.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        target: input.target,
        scope: input.scope,
        projectId: input.scope === 'project' ? (input.projectId ?? null) : null,
        body: input.body,
        createdBy: input.createdBy ?? null,
      },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      target: row.target,
      scope: row.scope,
      projectId: row.projectId,
      body: row.body,
      builtIn: false,
      variables: collectPromptVariables(row.body),
    };
  }

  async updateTemplate(
    id: string,
    input: {
      name?: string;
      description?: string;
      body?: string;
    },
  ): Promise<PromptTemplateItem> {
    const existing = await this.prisma.promptTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Prompt template ${id} not found`);
    }
    const row = await this.prisma.promptTemplate.update({
      where: { id },
      data: {
        ...(input.name === undefined ? {} : { name: input.name.trim() }),
        ...(input.description === undefined
          ? {}
          : { description: input.description.trim() || null }),
        ...(input.body === undefined ? {} : { body: input.body }),
      },
    });
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      target: row.target,
      scope: row.scope,
      projectId: row.projectId,
      body: row.body,
      builtIn: false,
      variables: collectPromptVariables(row.body),
    };
  }

  async deleteTemplate(id: string): Promise<void> {
    const existing = await this.prisma.promptTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Prompt template ${id} not found`);
    }
    await this.prisma.promptTemplate.delete({ where: { id } });
  }

  /**
   * 模板插值干跑（选用预览）：按任务事实插值模板正文，与派发面
   * loadPromptGovernance → interpolate 同一引擎同一事实口径（所见即所派）。
   */
  async previewTemplate(input: { body: string; issueId: string }): Promise<{
    issueId: string;
    body: string;
    text: string;
    missingVars: string[];
  }> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: input.issueId },
      include: { project: { select: { name: true, projectCode: true } } },
    });
    if (!issue) {
      throw new NotFoundException(`Task ${input.issueId} not found`);
    }
    const criteria = await this.prisma.acceptanceCriteria.findMany({
      where: { acceptance: { issueId: issue.id } },
      orderBy: [{ order: 'asc' }],
      select: { content: true },
      take: 20,
    });
    const facts: PromptTemplateFacts = buildTaskPromptFacts({
      issue: {
        title: issue.title,
        description: issue.description,
        type: issue.type,
        priority: issue.priority,
        status: issue.status,
        acceptanceItems: criteria.map((c) => c.content),
      },
      projectName: issue.project?.name ?? null,
      projectCode: issue.project?.projectCode ?? null,
    });
    const { text, missingVars } = interpolatePromptTemplate(input.body, facts);
    return { issueId: issue.id, body: input.body, text, missingVars };
  }

  /* ---------------------------------------------------------------- */
  /* 注入率统计（增强 C）                                              */
  /* ---------------------------------------------------------------- */

  /**
   * 注入率统计（增强批 C）：读最近 N 条 Execution 的持久化载荷，
   * 按段头 marker 解析各段实际注入率与平均字符开销。
   * 读失败/无样本时返回空统计（promptCount=0），不抛错——可观测是增益不是依赖。
   */
  async getUsageStats(sampleSize = 50): Promise<{
    sampleSize: number;
    promptCount: number;
    avgPromptChars: number;
    sections: PromptSectionUsage[];
  }> {
    const take = Math.min(Math.max(sampleSize, 1), USAGE_STATS_MAX_SAMPLE);
    let executions: Array<{ input: unknown }>;
    try {
      executions = await this.prisma.execution.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        select: { input: true },
      });
    } catch {
      return {
        sampleSize: take,
        promptCount: 0,
        avgPromptChars: 0,
        sections: Object.keys(PROMPT_SECTION_MARKERS).map((key) => ({
          key,
          count: 0,
          ratio: 0,
          avgChars: 0,
        })),
      };
    }

    const prompts = executions
      .map((row) => {
        const input =
          typeof row.input === 'object' && row.input !== null
            ? (row.input as Record<string, unknown>)
            : null;
        const prompt = input?.prompt;
        return typeof prompt === 'string' && prompt.trim()
          ? (prompt as string)
          : null;
      })
      .filter((p): p is string => !!p);

    if (prompts.length === 0) {
      // 无样本：返回全零骨架（前端免判空，语义=还没数据而非端点不可用）
      return {
        sampleSize: take,
        promptCount: 0,
        avgPromptChars: 0,
        sections: Object.keys(PROMPT_SECTION_MARKERS).map((key) => ({
          key,
          count: 0,
          ratio: 0,
          avgChars: 0,
        })),
      };
    }

    const totals: Record<string, { count: number; chars: number }> = {};
    let totalChars = 0;
    for (const prompt of prompts) {
      totalChars += prompt.length;
      const sections = parsePromptSections(prompt);
      for (const [key, chars] of Object.entries(sections)) {
        const bucket = (totals[key] ??= { count: 0, chars: 0 });
        bucket.count += 1;
        bucket.chars += chars;
      }
    }

    const sections: PromptSectionUsage[] = Object.keys(
      PROMPT_SECTION_MARKERS,
    ).map((key) => {
      const bucket = totals[key] ?? { count: 0, chars: 0 };
      return {
        key,
        count: bucket.count,
        ratio: prompts.length ? bucket.count / prompts.length : 0,
        avgChars: bucket.count ? Math.round(bucket.chars / bucket.count) : 0,
      };
    });

    return {
      sampleSize: take,
      promptCount: prompts.length,
      avgPromptChars: Math.round(totalChars / prompts.length),
      sections,
    };
  }
}
