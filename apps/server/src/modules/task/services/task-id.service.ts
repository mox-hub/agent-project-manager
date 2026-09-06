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

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';

const SEQ_PAD = 3;
const INBOX_PROJECT_CODE = 'INBOX';
const INBOX_MODULE_CODE = 'INBX';
export const INBOX_PROJECT_ID = 'project-inbox';
const INBOX_PROJECT_NAME = 'Inbox';

// 项目无任何模块时自动注册的默认模块（与前端统一创建对话框的兜底 code 一致）
export const DEFAULT_PROJECT_MODULE_CODE = 'TASK';

// 默认 shortID 前缀
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

  formatShortId(projectCode: string, moduleCode: string, seq: number): string {
    const padded = String(seq).padStart(SEQ_PAD, '0');
    return `${projectCode || DEFAULT_SHORT_ID_PREFIX}-${moduleCode}-${padded}`;
  }

  /**
   * 原子递增项目计数器, 返回下一个短 ID。
   * 当 projectId 缺失时, 自动 fallback 到全局 inbox 项目并使用 INBX 模块代码。
   * 永远返回 shortId (无项目时也保证有值)。
   *
   * moduleCode 解析顺序（真实项目）:
   *   1. 显式传入且已登记 → 直接使用
   *   2. 项目已有模块 → 取第一个（前端模块查询未加载时的兜底, 避免 400）
   *   3. 项目无任何模块 → 自动登记默认模块（TASK 或传入的合法 code）, 自愈存量项目
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
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        throw new NotFoundException(`项目不存在: ${projectId}`);
      }

      const modules = await this.prisma.projectModule.findMany({
        where: { projectId },
        orderBy: { createdAt: 'asc' },
      });
      const explicit =
        moduleCode && /^[A-Z]{2,4}$/.test(moduleCode) ? moduleCode : null;
      if (explicit && modules.some((m) => m.code === explicit)) {
        effectiveModuleCode = explicit;
      } else if (modules.length > 0) {
        effectiveModuleCode = modules[0].code;
      } else {
        // 项目无模块: 登记默认模块后使用（存量项目无默认模块时建任务不再 400）
        effectiveModuleCode = explicit ?? DEFAULT_PROJECT_MODULE_CODE;
        await this.prisma.projectModule.create({
          data: {
            projectId,
            code: effectiveModuleCode,
            name: effectiveModuleCode,
            description: '建任务时自动登记的默认模块',
          },
        });
      }
    }

    // 原子递增 (SQLite + Prisma transaction 模拟自增)
    const project = await this.prisma.project.findUnique({
      where: { id: effectiveProjectId },
    });
    // projectCode 兜底按身份区分：真实项目缺 code 回落 APM 前缀；
    // 只有 inbox 本身才用 INBOX（此前统一兜 INBOX，会把真实项目的新短 ID
    // 撞到 inbox 命名空间已被占用的号上）
    const projectCode =
      effectiveProjectId === INBOX_PROJECT_ID
        ? INBOX_PROJECT_CODE
        : project?.projectCode || DEFAULT_SHORT_ID_PREFIX;

    // 序列号自愈：lastSeq 可能落后于存量任务（种子 / 导入 / 计数器缺失），
    // 生成的 shortId 全局唯一，撞号时在事务内跳过被占用的序号再落账
    const next = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.projectSequence.findUnique({
        where: { projectId: effectiveProjectId },
      });
      let seq = (existing?.lastSeq ?? 0) + 1;
      while (
        await tx.task.findFirst({
          where: {
            shortId: this.formatShortId(projectCode, effectiveModuleCode, seq),
          },
          select: { id: true },
        })
      ) {
        seq += 1;
      }
      await tx.projectSequence.upsert({
        where: { projectId: effectiveProjectId },
        create: { projectId: effectiveProjectId, lastSeq: seq },
        update: { lastSeq: seq },
      });
      return seq;
    });

    return this.formatShortId(projectCode, effectiveModuleCode, next);
  }

  /**
   * 确保全局 inbox 项目存在并返回其 ID。
   * 系统级 (admin) 拥有此项目, 任何用户都可以往这里挂载未绑定的任务/Bug。
   * 传入 userId 时同时补挂该用户的 inbox 成员身份（幂等）——
   * 否则普通用户建 inbox 任务后 findOne/findAll 的项目成员可见性校验会 404。
   */
  async ensureInboxProject(userId?: string): Promise<string> {
    const existing = await this.prisma.project.findUnique({
      where: { id: INBOX_PROJECT_ID },
    });
    if (!existing) {
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
        where: {
          projectId_code: {
            projectId: INBOX_PROJECT_ID,
            code: INBOX_MODULE_CODE,
          },
        },
        create: {
          projectId: INBOX_PROJECT_ID,
          code: INBOX_MODULE_CODE,
          name: 'Inbox',
          description: '未绑定项目的默认模块',
        },
        update: {},
      });
    }

    if (userId) {
      await this.prisma.projectMember.upsert({
        where: {
          projectId_userId: { projectId: INBOX_PROJECT_ID, userId },
        },
        create: { projectId: INBOX_PROJECT_ID, userId, role: 'member' },
        update: {},
      });
    }

    return INBOX_PROJECT_ID;
  }
}
