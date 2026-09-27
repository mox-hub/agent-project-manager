/**
 * 提示词治理共享逻辑（CAP-A-24）
 *
 * PromptService（REST 面）与 CliDispatchService（派发面）共用的读写与组装
 * 纯函数层：注入开关（AppConfig workspace 级单行 JSON）、项目级提示词
 * （AppConfig project 级）、任务级提示词（Issue.metadata.taskPrompt）、
 * 系统段组装。全部读取 fail-open：读失败按默认值（全开 / 无提示词）处理，
 * 提示词治理永远不阻断派发主链路。
 */

import { Prisma } from '@prisma/client';
import type { PrismaService } from '@/core/database/prisma.service';
import {
  SYSTEM_PROMPT_TEMPLATES,
  buildSystemPromptSection,
  findSystemPromptTemplate,
  type SystemPromptDetail,
  type SystemPromptMeta,
} from './prompt-templates';

/**
 * 注入开关（逐段控制派发 prompt 的组成部分）。
 * 增强批 C（2026-09-26）：role/member/thinking 三段合并为 executor 执行者段，
 * 开关 8→7 键收敛；normalize 兼容存量 8 键配置（role/member 任一为 false
 * 即映射 executor=false，不丢用户已关的开关）。
 */
export interface PromptInjectionToggles {
  /** 系统提示词（内置规范段） */
  system: boolean;
  /** 项目级提示词 */
  project: boolean;
  /** 执行者段（角色 promptHint 继承 + 成员个人提示词 + 思考强度） */
  executor: boolean;
  /** 团队规则（Team.teamPrompt） */
  team: boolean;
  /** 任务级自定义提示词（Issue.metadata.taskPrompt） */
  task: boolean;
  /** 项目技能段（与既有 dispatch.skillsEnabled 项目开关 AND 叠加） */
  skills: boolean;
  /** 上下文 JSON 段 */
  context: boolean;
}

export const PROMPT_INJECTION_CONFIG_KEY = 'prompt.injection';
export const PROJECT_PROMPT_CONFIG_KEY = 'prompt.project';

export const DEFAULT_PROMPT_INJECTION: PromptInjectionToggles = {
  system: true,
  project: true,
  executor: true,
  team: true,
  task: true,
  skills: true,
  context: true,
};

const TOGGLE_KEYS = Object.keys(DEFAULT_PROMPT_INJECTION) as Array<
  keyof PromptInjectionToggles
>;

/**
 * 归一存储值：非法/缺失的键回落默认 true，多余键忽略。
 * 旧 8 键兼容：executor 未显式配置时按旧 role/member 合成（任一关则关）。
 */
export function normalizePromptInjection(raw: unknown): PromptInjectionToggles {
  const source =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const result = { ...DEFAULT_PROMPT_INJECTION };
  for (const key of TOGGLE_KEYS) {
    if (typeof source[key] === 'boolean') result[key] = source[key] as boolean;
  }
  if (typeof source.executor !== 'boolean') {
    const legacyRole = source.role;
    const legacyMember = source.member;
    if (legacyRole === false || legacyMember === false) {
      result.executor = false;
    }
  }
  return result;
}

/**
 * 派发 prompt 段头 marker（与 cli-dispatch buildPromptSegments 的段标题
 * 一一对应，供注入率统计解析真实载荷）。system 段无二级标题，用内置
 * 首卡的一级标题识别；taskBody/closing 恒注入不列入治理统计口径外。
 */
export const PROMPT_SECTION_MARKERS: Record<string, string> = {
  system: '# APM 协作基线',
  executor: '## Your Role',
  team: '## Team Rules',
  project: '## Project Instructions',
  task: '## Task Instructions',
  skills: '## Project Skills',
  taskBody: '# Task',
  context: '## Context',
};

/** 段注入率单条统计 */
export interface PromptSectionUsage {
  key: string;
  /** 样本中出现该段的次数 */
  count: number;
  /** 注入率（count / 有 prompt 的样本数，0~1） */
  ratio: number;
  /** 平均字符数（仅统计出现的样本） */
  avgChars: number;
}

/**
 * 解析单条派发 prompt 的段字符分布（按 marker 切片）。
 * 未命中任何 marker 返回空对象——历史载荷无 prompt 字段时调用方跳过。
 */
export function parsePromptSections(prompt: string): Record<string, number> {
  const entries = Object.entries(PROMPT_SECTION_MARKERS)
    .map(([key, marker]) => ({ key, index: prompt.indexOf(marker) }))
    .filter((e) => e.index >= 0)
    .sort((a, b) => a.index - b.index);
  const result: Record<string, number> = {};
  for (let i = 0; i < entries.length; i++) {
    const end = i + 1 < entries.length ? entries[i + 1].index : prompt.length;
    result[entries[i].key] = end - entries[i].index;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/* 提示词模板插值引擎（CAP-A-24 增强 A）                                */
/* ------------------------------------------------------------------ */

const VARIABLE_RE = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/g;

/** 支持的插值变量词表（模板编辑器的提示与校验口径） */
export const PROMPT_TEMPLATE_VARIABLES = [
  'issue.title',
  'issue.description',
  'issue.type',
  'issue.priority',
  'issue.status',
  'issue.acceptanceItems',
  'project.name',
  'project.code',
  'member.name',
  'today',
] as const;

export type PromptTemplateFacts = Record<string, string | undefined>;

/** 提取模板正文中的变量名清单（去重保序） */
export function collectPromptVariables(body: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of body.matchAll(VARIABLE_RE)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      result.push(name);
    }
  }
  return result;
}

export interface PromptTemplateInterpolation {
  /** 插值后的正文 */
  text: string;
  /** 事实表里没有的变量（正文原样保留占位，不静默清空） */
  missingVars: string[];
}

/**
 * 按事实表插值模板正文。纯函数：
 * - 已知变量替换为事实值（多行事实原样保留换行）
 * - 事实缺失的变量保留 `{{var}}` 占位并记入 missingVars（fail-open——
 *   插值失败不产生残缺文本，调用方决定是否提示）
 * - 无变量的正文零变化
 */
export function interpolatePromptTemplate(
  body: string,
  facts: PromptTemplateFacts,
): PromptTemplateInterpolation {
  const missingVars = new Set<string>();
  const text = body.replace(VARIABLE_RE, (raw, name: string) => {
    const value = facts[name];
    if (typeof value === 'string' && value.trim()) return value;
    missingVars.add(name);
    return raw;
  });
  return { text, missingVars: [...missingVars] };
}

/** 任务级提示词插值的事实载荷（服务端组装，插值引擎保持纯函数） */
export interface TaskPromptFactSource {
  title: string;
  description?: string | null;
  type?: string | null;
  priority?: string | null;
  status?: string | null;
  acceptanceItems?: string[];
}

/**
 * 从工单/项目/成员事实构造插值事实表。
 * 验收标准由调用方查出 content 列表传入；无标准时该变量缺失（保留占位）。
 */
export function buildTaskPromptFacts(input: {
  issue: TaskPromptFactSource;
  projectName?: string | null;
  projectCode?: string | null;
  memberName?: string | null;
  today?: Date;
}): PromptTemplateFacts {
  const { issue } = input;
  return {
    'issue.title': issue.title,
    'issue.description': issue.description?.trim() || undefined,
    'issue.type': issue.type ?? undefined,
    'issue.priority': issue.priority ?? undefined,
    'issue.status': issue.status ?? undefined,
    'issue.acceptanceItems':
      issue.acceptanceItems && issue.acceptanceItems.length > 0
        ? issue.acceptanceItems.map((c, i) => `${i + 1}. ${c}`).join('\n')
        : undefined,
    'project.name': input.projectName ?? undefined,
    'project.code': input.projectCode ?? undefined,
    'member.name': input.memberName ?? undefined,
    today: (input.today ?? new Date()).toISOString().slice(0, 10),
  };
}

/** 读注入开关（workspace 级单行 JSON；读失败 fail-open 全开） */
export async function readPromptInjectionToggles(
  prisma: PrismaService,
): Promise<PromptInjectionToggles> {
  try {
    const row = await prisma.appConfig.findFirst({
      where: { scope: 'workspace', key: PROMPT_INJECTION_CONFIG_KEY },
    });
    return normalizePromptInjection(row?.value);
  } catch {
    return { ...DEFAULT_PROMPT_INJECTION };
  }
}

/** 写注入开关（部分键合并；读失败不吞写入错误——设置页要感知） */
export async function writePromptInjectionToggles(
  prisma: PrismaService,
  partial: Partial<PromptInjectionToggles>,
): Promise<PromptInjectionToggles> {
  const current = await readPromptInjectionToggles(prisma);
  const next = normalizePromptInjection({ ...current, ...partial });
  const existing = await prisma.appConfig.findFirst({
    where: { scope: 'workspace', key: PROMPT_INJECTION_CONFIG_KEY },
  });
  if (existing) {
    await prisma.appConfig.update({
      where: { id: existing.id },
      data: { value: next as unknown as Prisma.InputJsonValue },
    });
  } else {
    await prisma.appConfig.create({
      data: {
        scope: 'workspace',
        key: PROMPT_INJECTION_CONFIG_KEY,
        value: next as unknown as Prisma.InputJsonValue,
      },
    });
  }
  return next;
}

/** 读项目级提示词（AppConfig project 级；未配置返回 null） */
export async function readProjectPrompt(
  prisma: PrismaService,
  projectId: string,
): Promise<string | null> {
  try {
    const row = await prisma.appConfig.findFirst({
      where: { scope: 'project', projectId, key: PROJECT_PROMPT_CONFIG_KEY },
    });
    const text = typeof row?.value === 'string' ? row.value : null;
    return text && text.trim() ? text : null;
  } catch {
    return null;
  }
}

/** 写项目级提示词（空串清空即删行；返回最终生效文本） */
export async function writeProjectPrompt(
  prisma: PrismaService,
  projectId: string,
  text: string,
): Promise<string | null> {
  const trimmed = text.trim();
  const existing = await prisma.appConfig.findFirst({
    where: { scope: 'project', projectId, key: PROJECT_PROMPT_CONFIG_KEY },
  });
  if (!trimmed) {
    if (existing) await prisma.appConfig.delete({ where: { id: existing.id } });
    return null;
  }
  if (existing) {
    await prisma.appConfig.update({
      where: { id: existing.id },
      data: { value: trimmed },
    });
  } else {
    await prisma.appConfig.create({
      data: {
        scope: 'project',
        projectId,
        key: PROJECT_PROMPT_CONFIG_KEY,
        value: trimmed,
      },
    });
  }
  return trimmed;
}

/** 从 Issue.metadata 提取任务级自定义提示词（缺失/非字符串返回 null） */
export function extractTaskPrompt(metadata: unknown): string | null {
  if (typeof metadata !== 'object' || metadata === null) return null;
  const value = (metadata as Record<string, unknown>).taskPrompt;
  if (typeof value !== 'string' || !value.trim()) return null;
  return value;
}

/** 系统提示词元数据列表（REST 列表态） */
export function listSystemPromptMetas(): SystemPromptMeta[] {
  return SYSTEM_PROMPT_TEMPLATES.map((t) => ({
    key: t.key,
    title: t.title,
    description: t.description,
    charCount: t.content.length,
  }));
}

/** 系统提示词详情（只读全文）；未知 key 返回 null */
export function getSystemPromptDetail(key: string): SystemPromptDetail | null {
  const template = findSystemPromptTemplate(key);
  if (!template) return null;
  return {
    key: template.key,
    title: template.title,
    description: template.description,
    charCount: template.content.length,
    content: template.content,
  };
}

export { buildSystemPromptSection };
