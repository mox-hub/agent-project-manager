/**
 * Task ID Service - 任务 ID 管理服务
 *
 * 提供任务 shortId 相关的管理功能，包括 backfill 操作
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { TaskIdService } from './task-id.service';

export interface BackfillResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

@Injectable()
export class TaskIdManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taskIdService: TaskIdService,
  ) {}

  /**
   * 补充所有缺少 shortId 任务的 shortId
   * 两段式全局序号：{前缀}-{递增序号}，与项目无关
   */
  async backfillMissingShortIds(): Promise<BackfillResult> {
    const result: BackfillResult = {
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    };

    // 查找所有没有 shortId 的任务
    const tasksWithoutShortId = await this.prisma.issue.findMany({
      where: { shortId: null },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { id: true },
    });

    result.total = tasksWithoutShortId.length;

    if (result.total === 0) {
      return result;
    }

    for (const task of tasksWithoutShortId) {
      try {
        const shortId = await this.taskIdService.nextShortId();
        await this.prisma.issue.update({
          where: { id: task.id },
          data: { shortId },
        });
        result.success++;
      } catch (error) {
        result.failed++;
        result.errors.push(`Task ${task.id}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  /**
   * 获取 shortId 统计信息
   */
  async getShortIdStats() {
    const [total, withShortId, withoutShortId] = await Promise.all([
      this.prisma.issue.count(),
      this.prisma.issue.count({ where: { shortId: { not: null } } }),
      this.prisma.issue.count({ where: { shortId: null } }),
    ]);

    return {
      total,
      withShortId,
      withoutShortId,
    };
  }
}
