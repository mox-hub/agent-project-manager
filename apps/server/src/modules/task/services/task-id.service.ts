// task-id.service.ts - 短 ID 生成器
//
// 两段式全局短 ID: {前缀}-{全局递增序号}，如 "MOX-1"、"MOX-99"、"MOX-139"。
//   - 前缀读全局配置 task.shortIdPrefix（未配置回落 APM），改前缀只影响新号
//   - 序号来自全局唯一序列（GlobalSequence），与项目/模块无关：
//     创建、跨项目移动、修改其他属性都不改变 shortId，shortId 生命周期 = 任务生命周期
//   - 事务内自增 + 跳过被占用序号（存量/导入导致计数器落后时自愈）

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

// 全局序列在 GlobalSequence 表中的键
export const GLOBAL_SEQUENCE_KEY = 'task.shortId';

// 默认 shortID 前缀（配置缺失时使用）
const DEFAULT_SHORT_ID_PREFIX = 'APM';

@Injectable()
export class TaskIdService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取 shortID 前缀配置
   * 优先从系统配置读取，否则使用默认值
   */
  async getShortIdPrefix(): Promise<string> {
    const config = await this.prisma.appConfig.findFirst({
      where: {
        key: 'task.shortIdPrefix',
        scope: 'global',
      },
    });
    return (config?.value as string) || DEFAULT_SHORT_ID_PREFIX;
  }

  /**
   * 设置 shortID 前缀
   */
  async setShortIdPrefix(prefix: string): Promise<void> {
    // 验证前缀格式：2-4 个大写字母
    if (!/^[A-Z]{2,4}$/.test(prefix)) {
      throw new BadRequestException('shortID 前缀必须是 2-4 个大写字母');
    }

    // 先查找是否存在
    const existing = await this.prisma.appConfig.findFirst({
      where: { key: 'task.shortIdPrefix', scope: 'global' },
    });

    if (existing) {
      await this.prisma.appConfig.update({
        where: { id: existing.id },
        data: { value: prefix },
      });
    } else {
      await this.prisma.appConfig.create({
        data: {
          key: 'task.shortIdPrefix',
          value: prefix,
          scope: 'global',
        },
      });
    }
  }

  formatShortId(prefix: string, seq: number): string {
    return `${prefix}-${seq}`;
  }

  /**
   * 原子递增全局计数器, 返回下一个短 ID（两段式, 无补零）。
   * 序号全局唯一递增, 与任务所属项目无关——跨项目移动不换号。
   */
  async nextShortId(): Promise<string> {
    const prefix = await this.getShortIdPrefix();

    // 序列号自愈：lastSeq 可能落后于存量任务（种子 / 导入 / 计数器缺失），
    // 生成的 shortId 全局唯一，撞号时在事务内跳过被占用的序号再落账
    const next = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.globalSequence.findUnique({
        where: { key: GLOBAL_SEQUENCE_KEY },
      });
      let seq = (existing?.lastSeq ?? 0) + 1;
      while (
        await tx.task.findFirst({
          where: { shortId: this.formatShortId(prefix, seq) },
          select: { id: true },
        })
      ) {
        seq += 1;
      }
      await tx.globalSequence.upsert({
        where: { key: GLOBAL_SEQUENCE_KEY },
        create: { key: GLOBAL_SEQUENCE_KEY, lastSeq: seq },
        update: { lastSeq: seq },
      });
      return seq;
    });

    return this.formatShortId(prefix, next);
  }
}
