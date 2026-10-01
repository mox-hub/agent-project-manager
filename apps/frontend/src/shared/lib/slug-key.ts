/**
 * 名称 → 内部 key 派生（设置·定义类管理弹窗共用：状态 / 角色…）。
 * 规则：小写 + 空格转下划线 + 去非法字符；非 ASCII 名（纯中文等）生成 `随机前缀_随机键`；
 * 与存量键撞车自动加序号。key 为内部标识，弹窗只读展示不暴露输入框。
 */
export function deriveSlugKey(
  name: string,
  takenKeys: Iterable<string>,
  randomPrefix = 'status',
): string {
  const taken = new Set(takenKeys);
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  const root = base || `${randomPrefix}_${Date.now().toString(36)}`;
  let key = root;
  let n = 2;
  while (taken.has(key)) key = `${root}_${n++}`;
  return key;
}
