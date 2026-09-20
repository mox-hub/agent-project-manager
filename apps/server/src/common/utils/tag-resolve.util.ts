// tag-resolve.util.ts - 标签解析工具
//
// 统一创建对话框等调用方按「tag id 或名字」提交标签：
//   - 元素能按 id 命中 → 直接使用
//   - 名字按「项目内 → 全局」顺序匹配现有标签（同 resourceType 域内）
//   - 都没有 → 按需创建（项目域或全局域）
// 任务（resourceType='task'）与文档（'document'）各自独立域, 不共享。

import type { PrismaClient } from '@prisma/client';

export async function resolveTagIds(
  prisma: PrismaClient,
  options: {
    projectId: string | null;
    entries: string[];
    userId: string;
    resourceType: string;
  },
): Promise<string[]> {
  const { projectId, entries, userId, resourceType } = options;
  const resolved: string[] = [];
  for (const entry of entries) {
    const name = entry?.trim();
    if (!name) continue;
    const byId = await prisma.tag.findUnique({ where: { id: name } });
    if (byId) {
      resolved.push(byId.id);
      continue;
    }
    const scope = projectId
      ? { OR: [{ projectId }, { projectId: null }] }
      : { projectId: null };
    let tag = await prisma.tag.findFirst({
      where: { name, resourceType, ...scope },
    });
    if (!tag) {
      tag = await prisma.tag.create({
        data: { name, projectId, resourceType, createdBy: userId },
      });
    }
    resolved.push(tag.id);
  }
  return [...new Set(resolved)];
}
