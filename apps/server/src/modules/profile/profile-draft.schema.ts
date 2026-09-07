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
