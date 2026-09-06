/**
 * 4d 二期：内置 bug 六字段的 customFields 迁移工具。
 *
 * 六字段已从 Issue 独立列迁入 Issue.customFields JSON（键集 = IssueType.fieldSchema），
 * 本模块提供两个方向的转换：
 * - toCustomFieldsInput：DTO 顶层的旧字段名（severity 等）+ dto.customFields → 存储用 customFields
 * - withBuiltinCompat：存储对象 → 响应对象，把六字段回填到顶层（保持旧 API 消费方兼容）
 */

export const BUILTIN_CUSTOM_FIELD_KEYS = [
  'severity',
  'bugReproducibility',
  'bugStepsToReproduce',
  'bugEnvironment',
  'bugExpectedResult',
  'bugActualResult',
] as const;

export type BuiltinCustomFieldKey = (typeof BUILTIN_CUSTOM_FIELD_KEYS)[number];

type CustomFields = Record<string, unknown> | null | undefined;

/** 从（部分）DTO 中提取 customFields 输入：顶层旧字段优先级低于显式 customFields 同名键 */
export function toCustomFieldsInput(
  existing: CustomFields,
  dto: {
    customFields?: Record<string, unknown> | null;
  } & Partial<Record<BuiltinCustomFieldKey, string | null | undefined>>,
): Record<string, unknown> | undefined {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  for (const key of BUILTIN_CUSTOM_FIELD_KEYS) {
    if (dto[key] !== undefined) merged[key] = dto[key];
  }
  if (dto.customFields !== undefined) {
    if (dto.customFields === null) {
      for (const key of Object.keys(merged)) merged[key] = null;
    } else {
      Object.assign(merged, dto.customFields);
    }
  }
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/** 响应兼容：把 customFields 中的内置六字段回填到对象顶层（浅拷贝，不改原对象） */
export function withBuiltinCompat<T extends object>(
  issue: T,
): T & Partial<Record<BuiltinCustomFieldKey, unknown>> {
  const cf = ((issue as { customFields?: unknown }).customFields ??
    {}) as Record<string, unknown>;
  const compat: Partial<Record<BuiltinCustomFieldKey, unknown>> = {};
  for (const key of BUILTIN_CUSTOM_FIELD_KEYS) {
    if (cf[key] !== undefined) compat[key] = cf[key];
  }
  return { ...issue, ...compat };
}
