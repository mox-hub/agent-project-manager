// task-id.service.ts - 短 ID 生成器
//
// 用法:
//   - 创建任务/Bug 时, 业务层先选 moduleCode
//   - service.nextShortId(projectId, moduleCode) 原子递增 ProjectSequence.lastSeq
//   - 返回的 shortId 形如 "APM-PF-001" (3 位补零, 满 999 后会自然进位)
//
// inbox fallback:
//   - 当 projectId 为 null (未绑定项目) 时, 自动使用全局 inbox 项目
//     并使用 INBOX_MODULE_CODE ('INBX') 作为模块代码, 让未绑定的任务也能拿到短 ID

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

const SEQ_PAD = 3;
const INBOX_PROJECT_CODE = 'INBOX';
const INBOX_MODULE_CODE = 'INBX';
const INBOX_PROJECT_ID = 'project-inbox';
const INBOX_PROJECT_NAME = 'Inbox';

@Injectable()
export class TaskIdService {
  constructor(private readonly prisma: PrismaService) {}

  formatShortId(projectCode: string, moduleCode: string, seq: number): string {
    const padded = String(seq).padStart(SEQ_PAD, '0');
    return `${projectCode || 'APM'}-${moduleCode}-${padded}`;
  }

  /**
   * 原子递增项目计数器, 返回下一个短 ID。
   * 当 projectId 缺失时, 自动 fallback 到全局 inbox 项目并使用 INBX 模块代码。
   * 永远返回 shortId (无项目时也保证有值)。
   */
  async nextShortId(
    projectId: string | null | undefined,
    moduleCode?: string,
  ): Promise<string> {
    // 解析 effective 项目 / 模块代码
    let effectiveProjectId: string;
    let effectiveModuleCode: string;

    if (!projectId) {
      // 未绑定项目 → 解析 / 创建 inbox
      effectiveProjectId = await this.ensureInboxProject();
      effectiveModuleCode = INBOX_MODULE_CODE;
    } else if (projectId === INBOX_PROJECT_ID) {
      // 显式传入 inbox 项目 ID: 模块代码强制使用 INBX
      effectiveProjectId = INBOX_PROJECT_ID;
      effectiveModuleCode = INBOX_MODULE_CODE;
    } else {
      effectiveProjectId = projectId;
      if (!moduleCode || !/^[A-Z]{2,4}$/.test(moduleCode)) {
        throw new BadRequestException('moduleCode 必须是 2-4 位大写字母');
      }
      effectiveModuleCode = moduleCode;
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException(`项目不存在: ${projectId}`);
      }
      const moduleRow = await this.prisma.projectModule.findUnique({
        where: { projectId_code: { projectId, code: moduleCode } },
      });
      if (!moduleRow) {
        throw new BadRequestException(`模块代码 ${moduleCode} 不属于该项目`);
      }
    }

    // 原子递增 (SQLite + Prisma transaction 模拟自增)
    const project = await this.prisma.project.findUnique({
      where: { id: effectiveProjectId },
    });
    const projectCode = project?.projectCode || INBOX_PROJECT_CODE;

    const next = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.projectSequence.findUnique({
        where: { projectId: effectiveProjectId },
      });
      const nextSeq = (existing?.lastSeq ?? 0) + 1;
      await tx.projectSequence.upsert({
        where: { projectId: effectiveProjectId },
        create: { projectId: effectiveProjectId, lastSeq: nextSeq },
        update: { lastSeq: nextSeq },
      });
      return nextSeq;
    });

    return this.formatShortId(projectCode, effectiveModuleCode, next);
  }

  /**
   * 确保全局 inbox 项目存在并返回其 ID。
   * 系统级 (admin) 拥有此项目, 任何用户都可以往这里挂载未绑定的任务/Bug。
   */
  async ensureInboxProject(): Promise<string> {
    const existing = await this.prisma.project.findUnique({
      where: { id: INBOX_PROJECT_ID },
    });
    if (existing) return existing.id;

    // 找到任意一个 admin 作为 owner; 如果没有, 取第一个用户
    let ownerId: string | null = null;
    const adminAssignment = await this.prisma.roleAssignment.findFirst({
      where: { scopeType: 'global', role: 'admin' },
    });
    if (adminAssignment?.userId) {
      ownerId = adminAssignment.userId;
    } else {
      const firstUser = await this.prisma.user.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      ownerId = firstUser?.id ?? null;
    }

    if (!ownerId) {
      throw new BadRequestException('系统中没有用户, 无法创建 inbox 项目');
    }

    await this.prisma.project.create({
      data: {
        id: INBOX_PROJECT_ID,
        name: INBOX_PROJECT_NAME,
        description: '未绑定项目的临时存放区, 后续可将任务迁移到正式项目',
        type: 'team',
        visibility: 'private',
        status: 'active',
        projectCode: INBOX_PROJECT_CODE,
        createdBy: ownerId,
        members: {
          create: [{ userId: ownerId, role: 'owner' }],
        },
      },
    });

    // 同时创建 INBX 模块代码, 让后续短 ID 查找能命中
    await this.prisma.projectModule.upsert({
      where: { projectId_code: { projectId: INBOX_PROJECT_ID, code: INBOX_MODULE_CODE } },
      create: {
        projectId: INBOX_PROJECT_ID,
        code: INBOX_MODULE_CODE,
        name: 'Inbox',
        description: '未绑定项目的默认模块',
      },
      update: {},
    });

    return INBOX_PROJECT_ID;
  }
}