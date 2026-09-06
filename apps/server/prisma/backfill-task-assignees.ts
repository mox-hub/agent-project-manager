/**
 * 一次性回填：为存量任务按 V3 口径补 TaskAssignee 行。
 * - Task.aiAgentId（Member.id）→ 直接建 (taskId, aiAgentId)
 * - Task.assigneeId（User.id）→ 经 Member.userId 反查后建 (taskId, memberId)
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

  // (taskId, memberId) 去重
  const pairs = new Set<string>();
  for (const task of tasks) {
    if (task.aiAgentId) pairs.add(`${task.id}:${task.aiAgentId}`);
    if (task.assigneeId) {
      const memberId = memberIdByUserId.get(task.assigneeId);
      if (memberId) pairs.add(`${task.id}:${memberId}`);
    }
  }

  const pairList = [...pairs].map((pair) => {
    const [taskId, memberId] = pair.split(':');
    return { taskId, memberId };
  });
  if (pairList.length === 0) {
    console.log('没有需要回填的任务负责人');
    return;
  }

  const existing = await prisma.issueAssignee.findMany({
    where: {
      OR: pairList.map(({ taskId, memberId }) => ({ taskId, memberId })),
    },
    select: { taskId: true, memberId: true },
  });
  const existingKeys = new Set(
    existing.map((row) => `${row.taskId}:${row.memberId}`),
  );
  const toCreate = pairList.filter(
    ({ taskId, memberId }) => !existingKeys.has(`${taskId}:${memberId}`),
  );

  let created = 0;
  for (const { taskId, memberId } of toCreate) {
    await prisma.issueAssignee
      .create({ data: { taskId, memberId } })
      .then(() => {
        created += 1;
      })
      .catch((e: unknown) => {
        console.warn(
          `跳过 task=${taskId} member=${memberId}: ${
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
