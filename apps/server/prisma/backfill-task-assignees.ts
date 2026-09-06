/**
 * 一次性回填：为存量任务按 V3 口径补 TaskAssignee 行。
 * - Task.aiAgentId（Member.id）→ 直接建 (issueId, aiAgentId)
 * - Task.assigneeId（User.id）→ 经 Member.userId 反查后建 (issueId, memberId)
 * 只增 TaskAssignee，不改 Task 本身；重复执行幂等（先查已存在）。
 * 运行：pnpm exec tsx prisma/backfill-task-assignees.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const tasks = await prisma.issue.findMany({
    where: {
      OR: [{ assigneeId: { not: null } }, { aiAgentId: { not: null } }],
    },
    select: { id: true, assigneeId: true, aiAgentId: true },
  });

  const members = await prisma.member.findMany({
    where: { userId: { not: null } },
    select: { id: true, userId: true },
  });
  const memberIdByUserId = new Map<string, string>();
  for (const m of members) {
    if (m.userId) memberIdByUserId.set(m.userId, m.id);
  }

  // (issueId, memberId) 去重
  const pairs = new Set<string>();
  for (const task of tasks) {
    if (task.aiAgentId) pairs.add(`${task.id}:${task.aiAgentId}`);
    if (task.assigneeId) {
      const memberId = memberIdByUserId.get(task.assigneeId);
      if (memberId) pairs.add(`${task.id}:${memberId}`);
    }
  }

  const pairList = [...pairs].map((pair) => {
    const [issueId, memberId] = pair.split(':');
    return { issueId, memberId };
  });
  if (pairList.length === 0) {
    console.log('没有需要回填的任务负责人');
    return;
  }

  const existing = await prisma.issueAssignee.findMany({
    where: {
      OR: pairList.map(({ issueId, memberId }) => ({ issueId, memberId })),
    },
    select: { issueId: true, memberId: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.issueId}:${row.memberId}`),
  );
  const toCreate = pairList.filter(
    ({ issueId, memberId }) => !existingKeys.has(`${issueId}:${memberId}`),
  );

  let created = 0;
  for (const { issueId, memberId } of toCreate) {
    await prisma.issueAssignee
      .create({ data: { issueId, memberId } })
      .then(() => {
        created += 1;
      })
      .catch((e: unknown) => {
        console.warn(
          `跳过 task=${issueId} member=${memberId}: ${
            e instanceof Error ? e.message : e
          }`,
        );
      });
  }

  console.log(
    `回填完成：候选 ${pairList.length} 行，新建 ${created} 行，已存在 ${pairList.length - toCreate.length} 行`,
  );
}

main()
  .catch((e) => {
    console.error('回填失败:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
