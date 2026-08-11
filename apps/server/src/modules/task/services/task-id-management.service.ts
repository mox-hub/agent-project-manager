/**
 * Task ID Service - 任务 ID 管理服务
 * 
 * 提供任务 shortId 相关的管理功能，包括 backfill 操作
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

const DEFAULT_PREFIX = 'APM';

export interface BackfillResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class TaskIdManagementService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 补充所有缺少 shortId 任务的 shortId
   */
  async backfillMissingShortIds(): Promise<BackfillResult> {
    const result: BackfillResult = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };

    // 查找所有没有 shortId 的任务
    const tasksWithoutShortId = await this.prisma.task.findMany({
      where: { shortId: null },
      orderBy: [{ projectId: 'asc' }, { createdAt: 'asc' }],
    });

    result.total = tasksWithoutShortId.length;

    if (result.total === 0) {
      return result;
    }

    // 收集所有已使用的 shortId
    const allTasks = await this.prisma.task.findMany({
      where: { shortId: { not: null } },
      select: { shortId: true },
    });
    const usedShortIds = new Set<string>();
    for (const task of allTasks) {
      if (task.shortId) {
        usedShortIds.add(task.shortId);
      }
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

    // 处理每个项目
    for (const [projectId, tasks] of tasksByProject) {
      const projectCode = projectId === 'inbox' ? 'INBOX' : DEFAULT_PREFIX;
      const moduleCode = projectId === 'inbox' ? 'INBX' : 'GEN';

      // 获取当前项目的最大序号
      let maxSeq = 0;
      for (const shortId of usedShortIds) {
        if (shortId.startsWith(`${projectCode}-${moduleCode}-`)) {
          const parts = shortId.split('-');
          const seqPart = parts[parts.length - 1];
          const seq = parseInt(seqPart, 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
      sequenceMap.set(projectId, maxSeq);

      // 处理每个任务
      for (const task of tasks) {
        try {
          // 获取下一个序列号
          let seq = (sequenceMap.get(projectId) || 0) + 1;
          let shortId = `${projectCode}-${moduleCode}-${String(seq).padStart(3, '0')}`;

          // 确保 shortId 不重复
          while (usedShortIds.has(shortId)) {
            seq++;
            shortId = `${projectCode}-${moduleCode}-${String(seq).padStart(3, '0')}`;
          }

          // 标记为已使用
          usedShortIds.add(shortId);
          sequenceMap.set(projectId, seq);

          // 更新任务
          await this.prisma.task.update({
            where: { id: task.id },
            data: { shortId },
          });

          result.success++;
        } catch (error) {
          result.failed++;
          result.errors.push(`Task ${task.id}: ${(error as Error).message}`);
        }
      }
    }

    return result;
  }

  /**
   * 获取 shortId 统计信息
   */
  async getShortIdStats() {
    const [total, withShortId, withoutShortId] = await Promise.all([
      this.prisma.task.count(),
      this.prisma.task.count({ where: { shortId: { not: null } } }),
      this.prisma.task.count({ where: { shortId: null } }),
    ]);

    return {
      total,
      withShortId,
      withoutShortId,
    };
  }
}
