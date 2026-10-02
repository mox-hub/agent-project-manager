import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@prisma/client';

import { PrismaService } from '@/core/database/prisma.service';
import {
  findFirstAcrossWorkspaces,
  runInWorkspace,
} from '@/core/database/workspace-scope.util';
import { AuthService } from '@/modules/auth/auth.service';

/**
 * 团队邀请流程：公开预览 + 登录态接受（邮箱匹配）。
 * 接受时确保 User 关联 human Member 并写入 TeamMember。
 *
 * 工作区口径（CAP-A-25）：`TeamInvite` **没有 workspaceId 字段**，令牌只存在于签发它的
 * 工作区库内。而预览是公开端点（可能无工作区头）、接受端点又必须在「用户自己的账号所在
 * 库」校验登录态（选中工作区与该库不同源时，带 `x-workspace-id` 会被守卫在控制器之前
 * 401）。因此两个端点都**先按令牌跨库定位目标工作区**，再在其库上下文内完成全部读写；
 * 前端据此对 `/invites/*` 默认不带工作区头（见 frontend `api-client` 跳过头前缀）。
 *
 * 这是**显式切库**而非路由回落，P0-7 不因此松动（详见 workspace-scope.util.ts 头注释）。
 */
@Injectable()
export class InviteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  /** 公开预览：不泄露成员明细，仅团队名/邀请人/角色/状态 */
  async preview(token: string) {
    const hit = await findFirstAcrossWorkspaces(() =>
      this.prisma.teamInvite.findUnique({ where: { token } }),
    );
    if (!hit) throw new NotFoundException('邀请不存在');

    // 团队/邀请人的查询必须与令牌**同库**：离开扫描上下文后代理会回到调用方工作区，
    // 那样查出来的是另一个库的团队（挂上错的人名），故整体再进一次目标库上下文。
    return runInWorkspace(hit.workspaceId, async () => {
      const invite = hit.value;

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
    });
  }

  /**
   * 接受邀请：登录用户邮箱须与邀请邮箱一致（不区分大小写）。
   *
   * 「邀请即建」（CAP-A-25 ④）：接受时把主体**落进目标工作区库**——镜像 User
   * （保 id、绝不造第二个「人」）+ 建 human Member + 入队，对用户不可见。
   * 没有这一步，被邀请的人即使接受了邀请，目标库里也没有他的 User 行，切到该工作区
   * 登录必报「密码错误」（正确密码亦然）。
   */
  async accept(token: string, userId: string) {
    const hit = await findFirstAcrossWorkspaces(() =>
      this.prisma.teamInvite.findUnique({ where: { token } }),
    );
    if (!hit) throw new NotFoundException('邀请不存在');
    const invite = hit.value;

    if (invite.status !== 'pending') {
      throw new BadRequestException(
        `邀请已${invite.status === 'accepted' ? '接受' : '失效'}`,
      );
    }
    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('邀请已过期');
    }

    // 身份来源 = 调用方上下文所在库（JwtAuthGuard 已在此库校验过登录态）。
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!actor) throw new NotFoundException('用户不存在');

    if (
      invite.email &&
      actor.email?.toLowerCase() !== invite.email.trim().toLowerCase()
    ) {
      throw new BadRequestException(
        `该邀请面向 ${invite.email}，当前登录邮箱不匹配`,
      );
    }

    // 目标工作区库内：镜像主体 → 建 Member → 入队 → 核销邀请，全部同库。
    // 顺序写而非事务：任一步失败则邀请保持 pending，可原样重试（幂等）。
    return runInWorkspace(hit.workspaceId, async () => {
      const subject = await this.provisionSubject(actor);

      const member = await this.authService.ensureMemberForUser(subject.id, {
        email: subject.email ?? invite.email,
        displayName: subject.displayName,
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
    });
  }

  /**
   * 把来源库的主体写进当前（目标工作区）库，返回该库中的主体行。
   *
   * 解析顺序（每一步都是为了让「同一个物理人」在目标库里有且只有一行）：
   *  1. 同 id 已存在 → 直接复用（重复接受邀请 / 重放 幂等）；
   *  2. 同 email 已存在 → 复用（此人本就在该库注册过，绝不能因为镜像而造出第二行，
   *     否则 email 唯一约束报错、或产生两个「我」）；
   *  3. 同 username 已存在 → 复用（同上，username 亦唯一）；
   *  4. 都没有 → 按**同 id** 新建：沿用来源库 id 让跨库引用口径一致（不复制 Session——
   *     会话仍是每库独立，用户在目标工作区需重新登录一次，这是「每工作区独立身份」的
   *     必然结果，不是缺陷）。
   *
   * 复制 passwordHash 是必需的：否则用户无法在目标工作区登录，本能力等于没落地。
   */
  private async provisionSubject(actor: User): Promise<User> {
    const byId = await this.prisma.user.findUnique({ where: { id: actor.id } });
    if (byId) return byId;

    if (actor.email) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email: actor.email },
      });
      if (byEmail) return byEmail;
    }

    const byUsername = await this.prisma.user.findUnique({
      where: { username: actor.username },
    });
    if (byUsername) return byUsername;

    const created = await this.prisma.user.create({
      data: {
        id: actor.id,
        username: actor.username,
        displayName: actor.displayName,
        email: actor.email,
        passwordHash: actor.passwordHash,
        authProvider: actor.authProvider,
        avatarUrl: actor.avatarUrl,
        timezone: actor.timezone,
        isActive: actor.isActive,
      },
    });

    // 与 register 口径对齐：新建主体补全局 user 角色（仅对新建行做，不触碰既有行）。
    await this.prisma.roleAssignment.create({
      data: { userId: created.id, scopeType: 'global', role: 'user' },
    });

    return created;
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
