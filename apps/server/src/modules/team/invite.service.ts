import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/core/database/prisma.service';
import { AuthService } from '@/modules/auth/auth.service';

/**
 * 团队邀请流程：公开预览 + 登录态接受（邮箱匹配）。
 * 接受时确保 User 关联 human Member 并写入 TeamMember。
 */
@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /** 公开预览：不泄露成员明细，仅团队名/邀请人/角色/状态 */
  async preview(token: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new NotFoundException('邀请不存在');

    const team = await this.prisma.team.findUnique({
      where: { id: invite.teamId },
      select: { id: true, name: true, avatarUrl: true, ownerId: true },
    });
    const owner = team
      ? await this.prisma.user.findUnique({
          where: { id: team.ownerId },
          select: { displayName: true },
        })
      : null;

    const expired = invite.expiresAt.getTime() <= Date.now();
    const effectiveStatus =
      invite.status === 'pending' && expired ? 'expired' : invite.status;

    return {
      teamName: team?.name ?? '未知团队',
      teamAvatar: team?.avatarUrl ?? null,
      inviterName: owner?.displayName ?? '团队管理员',
      role: invite.role,
      email: invite.email,
      status: effectiveStatus,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  /** 接受邀请：登录用户邮箱须与邀请邮箱一致（不区分大小写） */
  async accept(token: string, userId: string) {
    const invite = await this.prisma.teamInvite.findUnique({
      where: { token },
    });
    if (!invite) throw new NotFoundException('邀请不存在');
    if (invite.status !== 'pending') {
      throw new BadRequestException(`邀请已${invite.status === 'accepted' ? '接受' : '失效'}`);
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('邀请已过期');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    if (
      invite.email &&
      user.email?.toLowerCase() !== invite.email.trim().toLowerCase()
    ) {
      throw new BadRequestException(
        `该邀请面向 ${invite.email}，当前登录邮箱不匹配`,
      );
    }

    const member = await this.authService.ensureMemberForUser(user.id, {
      email: user.email ?? invite.email,
      displayName: user.displayName,
    });

    const existing = await this.prisma.teamMember.findFirst({
      where: { teamId: invite.teamId, memberId: member.id },
    });
    if (!existing) {
      await this.prisma.teamMember.create({
        data: {
          teamId: invite.teamId,
          memberId: member.id,
          role: invite.role,
        },
      });
    }

    await this.prisma.teamInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    return { teamId: invite.teamId, memberId: member.id, role: invite.role };
  }

  /** 本地部署直邀：按 userId 建 Member 并直接入队（跳过邮件） */
  async directAdd(teamId: string, userId: string, role: string) {
    const team = await this.prisma.team.findUnique({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('用户不存在');

    const member = await this.authService.ensureMemberForUser(user.id, {
      email: user.email ?? undefined,
      displayName: user.displayName,
    });

    const existing = await this.prisma.teamMember.findFirst({
      where: { teamId, memberId: member.id },
    });
    if (existing) throw new BadRequestException('该用户已在团队中');

    return this.prisma.teamMember.create({
      data: { teamId, memberId: member.id, role },
    });
  }
}
