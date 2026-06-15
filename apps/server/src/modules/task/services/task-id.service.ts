// task-id.service.ts - 短 ID 生成器
//
// 用法:
//   - 创建任务/Bug 时, 业务层先选 moduleCode
//   - service.nextShortId(projectId, moduleCode) 原子递增 ProjectSequence.lastSeq
//   - 返回的 shortId 形如 "APM-PF-001" (3 位补零, 满 999 后会自然进位)

import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

const SEQ_PAD = 3;

@Injectable()
export class TaskIdService {
  constructor(private readonly prisma: PrismaService) {}

  formatShortId(projectCode: string, moduleCode: string, seq: number): string {
    const padded = String(seq).padStart(SEQ_PAD, '0');
    return `${projectCode || 'APM'}-${moduleCode}-${padded}`;
  }

  /**
   * 原子递增项目计数器, 返回下一个短 ID。
   */
  async nextShortId(projectId: string, moduleCode: string): Promise<string> {
    if (!moduleCode || !/^[A-Z]{2,4}$/.test(moduleCode)) {
      throw new BadRequestException('moduleCode 必须是 2-4 位大写字母');
    }
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new BadRequestException(`项目不存在: ${projectId}`);
    }
    const moduleRow = await this.prisma.projectModule.findUnique({
      where: { projectId_code: { projectId, code: moduleCode } },
    });
    if (!moduleRow) {
      throw new BadRequestException(`模块代码 ${moduleCode} 不属于该项目`);
    }

    // 原子递增 (SQLite + Prisma transaction 模拟自增)
    const next = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.projectSequence.findUnique({ where: { projectId } });
      const nextSeq = (existing?.lastSeq ?? 0) + 1;
      await tx.projectSequence.upsert({
        where: { projectId },
        create: { projectId, lastSeq: nextSeq },
        update: { lastSeq: nextSeq },
      });
      return nextSeq;
    });

    return this.formatShortId(project.projectCode || 'APM', moduleCode, next);
  }
}
