import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '@/core/database/prisma.service';
import { MailService } from '@/modules/mail/mail.service';
import { AuthService } from '@/modules/auth/auth.service';

/**
 * 管理员成员管理：账号列表/编辑、全局注册邀请 CRUD。
 * 建号复用 AuthService.createUserAccount（密码派生 + Member 镜像）。
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  /** 账号列表（含全局角色与关联 Member） */
  async listUsers() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
    });

    const ids = users.map((u) => u.id);
    const [roles, members] = await Promise.all([
      this.prisma.roleAssignment.findMany({
        where: { userId: { in: ids }, scopeType: 'global' },
      }),
      this.prisma.member.findMany({
        where: { userId: { in: ids } },
        select: { userId: true, id: true, status: true, shortId: true },
      }),
    ]);

    const roleMap = new Map<string, Array<{ id: string; role: string }>>();
    for (const r of roles) {
      const list = roleMap.get(r.userId) ?? [];
      list.push({ id: r.id, role: r.role });
      roleMap.set(r.userId, list);
    }
    const memberMap = new Map(members.map((m) => [m.userId, m]));

    return users.map((u) => ({
      ...u,
      roles: roleMap.get(u.id) ?? [],
      memberId: memberMap.get(u.id)?.id ?? null,
      memberStatus: memberMap.get(u.id)?.status ?? null,
      memberShortId: memberMap.get(u.id)?.shortId ?? null,
    }));
  }

  async createUser(dto: {
    displayName: string;
    email: string;
    username?: string;
    role?: string;
  }) {
    return this.authService.createUserAccount(dto);
  }

  /** 编辑账号：资料/停用启用/重置密码（重置仅本次响应返回新密码） */
  async updateUser(
    userId: string,
    dto: {
      displayName?: string;
      email?: string;
      isActive?: boolean;
      resetPassword?: boolean;
    },
    operatorId: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    if (dto.isActive === false && userId === operatorId) {
      throw new BadRequestException('不能停用当前登录账号');
    }

    if (dto.email) {
      const dup = await this.prisma.user.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (dup && dup.id !== userId) {
        throw new ConflictException('该邮箱已被其他账号使用');
      }
    }

    const data: Record<string, unknown> = {};
    if (dto.displayName !== undefined)
      data.displayName = dto.displayName.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    let generatedPassword: string | undefined;
    if (dto.resetPassword) {
      generatedPassword = randomBytes(9).toString('base64url');
      data.passwordHash = await bcrypt.hash(generatedPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      return { ...this.summarize(user), generatedPassword: undefined };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    // Member 镜像同步（displayName）
    if (data.displayName !== undefined) {
      await this.prisma.member.updateMany({
        where: { userId },
        data: { displayName: data.displayName as string },
      });
    }

    // 停用账号时吊销全部会话
    if (dto.isActive === false) {
      await this.prisma.session.deleteMany({ where: { userId } });
    }

    return { ...this.summarize(updated), generatedPassword };
  }

  /** 创建注册邀请（有邮箱时经 Outbox 发邮件） */
  async createInvite(
    dto: { email?: string; expiresInDays?: number },
    operatorId: string,
  ) {
    const email = dto.email?.trim().toLowerCase() || null;
    if (email) {
      const dup = await this.prisma.user.findUnique({ where: { email } });
      if (dup) throw new ConflictException('该邮箱已注册');
    }

    const operator = await this.prisma.user.findUnique({
      where: { id: operatorId },
      select: { displayName: true },
    });

    const days =
      dto.expiresInDays && dto.expiresInDays > 0 ? dto.expiresInDays : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const invite = await this.prisma.registrationInvite.create({
      data: {
        email,
        token: randomBytes(16).toString('hex'),
        expiresAt,
        createdById: operatorId,
      },
    });

    if (email) {
      await this.mailService.sendRegisterInvite({
        to: email,
        inviterName: operator?.displayName ?? '管理员',
        token: invite.token,
        expiresAt,
      });
    }

    return invite;
  }

  /** 邀请列表（pending 且过期视为 expired） */
  async listInvites() {
    const invites = await this.prisma.registrationInvite.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const creatorIds = [
      ...new Set(invites.map((i) => i.createdById).filter(Boolean)),
    ] as string[];
    const creators = await this.prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, displayName: true },
    });
    const creatorMap = new Map(creators.map((c) => [c.id, c.displayName]));

    const now = Date.now();
    return invites.map((i) => ({
      ...i,
      status:
        i.status === 'pending' && i.expiresAt.getTime() <= now
          ? 'expired'
          : i.status,
      createdBy: i.createdById ? (creatorMap.get(i.createdById) ?? null) : null,
    }));
  }

  async revokeInvite(id: string) {
    const invite = await this.prisma.registrationInvite.findUnique({
      where: { id },
    });
    if (!invite) throw new NotFoundException('邀请不存在');
    if (invite.status !== 'pending') {
      throw new BadRequestException('邀请已失效，无法撤销');
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('邀请已过期，无法撤销');
    }
    return this.prisma.registrationInvite.update({
      where: { id },
      data: { status: 'revoked' },
    });
  }

  /** 公开预览（注册页展示邀请人/受邀邮箱/状态） */
  async previewInvite(token: string) {
    const invite = await this.prisma.registrationInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new NotFoundException('邀请不存在');

    const inviter = invite.createdById
      ? await this.prisma.user.findUnique({
          where: { id: invite.createdById },
          select: { displayName: true },
        })
      : null;

    return {
      inviterName: inviter?.displayName ?? '管理员',
      email: invite.email,
      status:
        invite.status === 'pending' && invite.expiresAt.getTime() <= Date.now()
          ? 'expired'
          : invite.status,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  private summarize(user: {
    id: string;
    username: string;
    displayName: string;
    email: string | null;
    avatarUrl: string | null;
    isActive: boolean;
  }) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
    };
  }
}
