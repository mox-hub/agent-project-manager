/**
 * frontmatter tags → DB DocumentTag 镜像的差集计算（纯函数，无 IO）。
 * 全量跟随语义：frontmatter 是唯一真相，DB 镜像缺则建/挂、多则摘。
 */

export interface TagMirrorInput {
  /** 项目级全部现有标签 */
  existing: Array<{ id: string; name: string }>;
  /** 文档当前已挂载的标签 */
  attached: Array<{ id: string; name: string }>;
  /** frontmatter 声明的标签名（唯一真相） */
  target: string[];
}

export interface TagMirrorPlan {
  toCreate: string[];
  toAttach: Array<{ id: string; name: string }>;
  toDetach: Array<{ id: string; name: string }>;
}

export function computeTagMirror({ existing, attached, target }: TagMirrorInput): TagMirrorPlan {
  const targetSet = new Set(target);
  const plan: TagMirrorPlan = { toCreate: [], toAttach: [], toDetach: [] };
  for (const name of target) {
    const tag = existing.find((t) => t.name === name);
    if (!tag) {
      plan.toCreate.push(name);
      continue;
    }
    if (!attached.some((t) => t.id === tag.id)) {
      plan.toAttach.push(tag);
    }
  }
  for (const tag of attached) {
    if (!targetSet.has(tag.name)) plan.toDetach.push(tag);
  }
  return plan;
}
