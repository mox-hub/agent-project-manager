/**
 * 补充旧任务的 shortId 脚本
 * 
 * 使用方法:
 *   npx tsx scripts/backfill-task-shortids.ts
 * 
 * 此脚本会:
 * 1. 查找所有没有 shortId 的任务
 * 2. 按项目分组，为每个项目分配计数器
 * 3. 为每个任务生成唯一的 shortId
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_PREFIX = 'APM';

async function getOrCreateSequence(projectId: string, sequenceMap: Map<string, number>): Promise<number> {
  if (sequenceMap.has(projectId)) {
    const current = sequenceMap.get(projectId)!;
    const next = current + 1;
    sequenceMap.set(projectId, next);
    return next;
  }
  
  // 从数据库获取当前最大值
  const existingTask = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  
  if (!existingTask) {
    // 这个项目还没有任务，从 1 开始
    sequenceMap.set(projectId, 1);
    return 1;
  }
  
  // 查找该项目的现有 shortId 中的最大序号
  const existingShortIds = await prisma.task.findMany({
    where: { 
      projectId,
      shortId: { not: null },
    },
    select: { shortId: true },
    orderBy: { createdAt: 'asc' },
  });
  
  let maxSeq = 0;
  for (const task of existingShortIds) {
    if (task.shortId) {
      const parts = task.shortId.split('-');
      const seqPart = parts[parts.length - 1];
      const seq = parseInt(seqPart, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }
  
  const nextSeq = maxSeq + 1;
  sequenceMap.set(projectId, nextSeq);
  return nextSeq;
}

async function main() {
  console.log('开始补充任务的 shortId...\n');

  try {
    // 查找所有没有 shortId 的任务
    const tasksWithoutShortId = await prisma.task.findMany({
      where: { shortId: null },
      orderBy: [{ projectId: 'asc' }, { createdAt: 'asc' }],
    });

    console.log(`找到 ${tasksWithoutShortId.length} 个任务需要补充 shortId\n`);

    if (tasksWithoutShortId.length === 0) {
      console.log('没有需要补充的任务。');
      return;
    }

    // 按项目分组
    const tasksByProject = new Map<string, typeof tasksWithoutShortId>();
    for (const task of tasksWithoutShortId) {
      const projectId = task.projectId || 'inbox';
      if (!tasksByProject.has(projectId)) {
        tasksByProject.set(projectId, []);
      }
      tasksByProject.get(projectId)!.push(task);
    }

    // 为每个项目初始化序列号
    const sequenceMap = new Map<string, number>();
    const usedShortIds = new Set<string>();
    
    // 收集所有已使用的 shortId
    const allTasks = await prisma.task.findMany({
      where: { shortId: { not: null } },
      select: { shortId: true },
    });
    for (const task of allTasks) {
      if (task.shortId) {
        usedShortIds.add(task.shortId);
      }
    }
    console.log(`系统已有 ${usedShortIds.size} 个 shortId\n`);
    
    // 处理每个项目
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const [projectId, tasks] of tasksByProject) {
      console.log(`\n处理项目 ${projectId}，共 ${tasks.length} 个任务...`);
      
      for (const task of tasks) {
        try {
          // 获取下一个序列号
          let seq = await getOrCreateSequence(projectId, sequenceMap);
          
          // 生成 shortId，确保不重复
          const projectCode = projectId === 'inbox' ? 'INBOX' : DEFAULT_PREFIX;
          const moduleCode = projectId === 'inbox' ? 'INBX' : 'GEN';
          let shortId = `${projectCode}-${moduleCode}-${String(seq).padStart(3, '0')}`;
          
          // 如果 shortId 已存在，递增直到找到空位
          while (usedShortIds.has(shortId)) {
            seq = sequenceMap.get(projectId)! + 1;
            sequenceMap.set(projectId, seq);
            shortId = `${projectCode}-${moduleCode}-${String(seq).padStart(3, '0')}`;
          }
          
          // 标记此 shortId 为已使用
          usedShortIds.add(shortId);
          // 更新序列号
          sequenceMap.set(projectId, seq);
          
          // 更新任务
          await prisma.task.update({
            where: { id: task.id },
            data: { shortId },
          });
          
          processedCount++;
          
          if (processedCount % 100 === 0) {
            console.log(`已处理 ${processedCount} 个任务...`);
          }
        } catch (error) {
          errorCount++;
          console.error(`  错误: 任务 ${task.id}: ${(error as Error).message}`);
        }
      }
      
      console.log(`项目 ${projectId} 处理完成`);
    }

    console.log(`\n========================================`);
    console.log(`shortId 补充完成！`);
    console.log(`成功: ${processedCount} 个任务`);
    console.log(`失败: ${errorCount} 个任务`);
    console.log(`========================================\n`);

  } catch (error) {
    console.error('执行失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
