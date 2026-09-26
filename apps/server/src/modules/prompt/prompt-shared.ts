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

/** 注入开关（逐段控制派发 prompt 的组成部分） */
export interface PromptInjectionToggles {
  /** 系统提示词（内置规范段） */
  system: boolean;
  /** 项目级提示词 */
  project: boolean;
  /** 角色提示（ProjectRoleDefinition.promptHint） */
  role: boolean;
  /** 团队规则（Team.teamPrompt） */
  team: boolean;
  /** 成员个人提示词（Member.personalPrompt，含思考强度） */
  member: boolean;
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
  role: true,
  team: true,
  member: true,
  task: true,
  skills: true,
  context: true,
};

const TOGGLE_KEYS = Object.keys(DEFAULT_PROMPT_INJECTION) as Array<
  keyof PromptInjectionToggles
>;

/** 归一存储值：非法/缺失的键回落默认 true，多余键忽略 */
export function normalizePromptInjection(raw: unknown): PromptInjectionToggles {
  const source =
    typeof raw === 'object' && raw !== null
      ? (raw as Record<string, unknown>)
      : {};
  const result = { ...DEFAULT_PROMPT_INJECTION };
  for (const key of TOGGLE_KEYS) {
    if (typeof source[key] === 'boolean') result[key] = source[key] as boolean;
  }
  return result;
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
