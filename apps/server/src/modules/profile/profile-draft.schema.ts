/**
 * 项目考古产物 schema（v2 纪要切片 1）。
 * 考古 Agent 按槽位输出结构化 JSON，经 ExecutionArtifact 持久化；
 * ingest 端点依据本 schema 校验后落 working 草稿原子（待人批准）。
 * 诚实边界：AI 产出一律低置信度、可溯源（sourceEventId=executionId）、人可驳回。
 */

import {
  PROFILE_SLOTS,
  isProfileSlot,
} from '@/modules/profile/profile-slot.registry';

export const PROFILE_DRAFT_SCHEMA_VERSION = 1 as const;

/** ExecutionArtifact.type：考古产物专用 artifact */
export const PROFILE_DRAFT_ARTIFACT_TYPE = 'profile_draft';

export interface ProfileDraftItem {
  /** 档案正文（原子：一条一个事实/结论） */
  content: string;
  /** 置信度 0-1（考古默认上限 0.6，AI 报高也会被 clamp） */
  confidence?: number;
  /** 出处（文件路径/配置位置等，写进 refs） */
  evidence?: string;
}

export interface ProfileDraftPayload {
  /** 产物 schema 版本 */
  schemaVersion: 1;
  /** 按槽位组织的考古结论 */
  slots: Array<{
    slot: string;
    items: ProfileDraftItem[];
  }>;
  /** 考古一句话总结（自由文本，进活动流） */
  summary?: string;
}

export const ARCHAEOLOGY_MAX_CONFIDENCE = 0.6;

/**
 * 从 CLI 最终输出的各形态中尽力取出考古 JSON（最后一公里容错）：
 * - 本身就是对象 → 原样；
 * - 字符串 → 剥掉 markdown 代码围栏后按花括号配平提取首个 JSON 对象再解析；
 * - 包裹对象（如 { response: "...json..." }）→ 对常见文本字段递归下钻。
 * 最多下钻 3 层，取不到就原样返回（交由 validateProfileDraft 如实报错）。
 */
const DRAFT_WRAP_KEYS = [
  'response',
  'output',
  'result',
  'text',
  'content',
  'summary',
  'message',
];

export function tryParseProfileDraft(raw: unknown, depth = 0): unknown {
  if (raw == null || depth > 3) return raw;
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (obj.schemaVersion !== undefined) return obj;
    for (const key of DRAFT_WRAP_KEYS) {
      const inner = obj[key];
      if (typeof inner === 'string' || (inner && typeof inner === 'object')) {
        const parsed = tryParseProfileDraft(inner, depth + 1);
        if (
          parsed &&
          typeof parsed === 'object' &&
          (parsed as Record<string, unknown>).schemaVersion !== undefined
        ) {
          return parsed;
        }
      }
    }
    return raw;
  }
  if (typeof raw !== 'string') return raw;

  const unfenced = raw
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
  const candidate = extractBalancedJsonObject(unfenced) ?? unfenced;
  try {
    return JSON.parse(candidate);
  } catch {
    return raw;
  }
}

/** 花括号配平提取首个顶层 JSON 对象（忽略字符串字面量内的引号与转义） */
export function extractBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * 校验考古产物。容忍部分槽位缺失（考古允许空槽——诚实边界：没扫到就不编），
 * 但槽位名必须是注册表内置槽位、items 非空数组且 content 为非空字符串。
 */
export function validateProfileDraft(
  payload: unknown,
):
  | { valid: true; draft: ProfileDraftPayload }
  | { valid: false; errors: string[] } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['<root> 不是对象'] };
  }
  const r = payload as Partial<ProfileDraftPayload>;
  const errors: string[] = [];

  if (r.schemaVersion !== PROFILE_DRAFT_SCHEMA_VERSION) {
    errors.push('schemaVersion 必须为 1');
  }
  if (!Array.isArray(r.slots)) {
    errors.push('slots 必须为数组');
    return { valid: false, errors };
  }

  r.slots.forEach((group, i) => {
    if (!group || typeof group !== 'object') {
      errors.push(`slots[${i}] 不是对象`);
      return;
    }
    if (typeof group.slot !== 'string' || !isProfileSlot(group.slot)) {
      errors.push(
        `slots[${i}].slot「${String(group.slot)}」不是内置槽位（可用：${PROFILE_SLOTS.join('、')}）`,
      );
      return;
    }
    if (!Array.isArray(group.items)) {
      errors.push(`slots[${i}].items 必须为数组`);
      return;
    }
    group.items.forEach((item, j) => {
      if (!item || typeof item.content !== 'string' || !item.content.trim()) {
        errors.push(`slots[${i}].items[${j}].content 不能为空`);
      }
      if (
        item?.confidence !== undefined &&
        (typeof item.confidence !== 'number' ||
          item.confidence < 0 ||
          item.confidence > 1)
      ) {
        errors.push(`slots[${i}].items[${j}].confidence 必须在 0-1`);
      }
    });
  });

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, draft: r as ProfileDraftPayload };
}
