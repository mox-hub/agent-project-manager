import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

export type BindingSource = 'direct' | 'team';

/**
 * 项目成员同步 —— V3 口径下 MemberProjectBinding 是用户侧真相源
 * （人 + AI 统一），ProjectMember（User 体系）降级为派生权限缓存：
 * 仅对有关联 userId 的人类成员双写/清理，guards 等权限校验零改动。
 *
 * team 来源的绑定可被「团队解绑项目」回收；direct 来源只在显式解绑时删除。
 */
@Injectable()
export class ProjectMembershipSyncService {
  private readonly logger = new Logger(ProjectMembershipSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** binding role → ProjectMember role（白名单直传，异常值回落 member） */
  private toProjectMemberRole(role: string | null | undefined): string {
    return role === 'owner' || role === 'maintainer' || role === 'guest'
      ? role
      : 'member';
  }

  /**
   * 确保成员在项目上有一行 binding（幂等；已有 direct 行时不降级为 team），
   * 并对有 userId 的成员同步 ProjectMember 权限缓存。
   */
  async propagateMemberToProject(
    member: { id: string; userId?: string | null },
    projectId: string,
    role: string | null | undefined,
    source: BindingSource,
  ): Promise<void> {
    const existing = await this.prisma.memberProjectBinding.findFirst({
      where: { memberId: member.id, projectId },
    });
    if (!existing) {
      await this.prisma.memberProjectBinding.create({
        data: {
          memberId: member.id,
          projectId,
          role: role ?? 'member',
          source,
        },
      });
    }

    if (!member.userId) return;
    await this.prisma.projectMember.upsert({
      where: {
        projectId_userId: { projectId, userId: member.userId },
      },
      create: {
        projectId,
        userId: member.userId,
        role: this.toProjectMemberRole(role),
      },
      // 已有权限缓存时不提权
      update: {},
    });
  }

  /**
   * binding 行删除后调用：成员在该项目已无任何 binding 时清掉权限缓存。
   */
  async revokeMemberFromProject(
    memberId: string,
    projectId: string,
  ): Promise<void> {
    const remaining = await this.prisma.memberProjectBinding.count({
      where: { memberId, projectId },
    });
    if (remaining > 0) return;

    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { userId: true },
    });
    if (!member?.userId) return;
    await this.prisma.projectMember
      .delete({
        where: {
          projectId_userId: { projectId, userId: member.userId },
        },
      })
      .catch(() => undefined);
  }

  /** 团队绑定项目：全体团队成员传播 binding（team 来源） */
  async propagateTeamToProject(
    teamId: string,
    projectId: string,
  ): Promise<void> {
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId },
      select: { memberId: true, role: true },
    });
    const members = await this.prisma.member.findMany({
      where: { id: { in: teamMembers.map((t) => t.memberId) } },
      select: { id: true, userId: true },
    });
    const roleByMemberId = new Map(
      teamMembers.map((t) => [t.memberId, t.role] as const),
    );
    for (const member of members) {
      await this.propagateMemberToProject(
        member,
        projectId,
        roleByMemberId.get(member.id) ?? 'member',
        'team',
      );
    }
    this.logger.log(
      `Team ${teamId} bound to project ${projectId}: propagated ${members.length} member bindings`,
    );
  }

  /** 成员加入团队：向团队已绑定的全部项目传播 */
  async propagateMemberToTeamProjects(
    member: { id: string; userId?: string | null },
    teamId: string,
  ): Promise<void> {
    const teamProjects = await this.prisma.teamProject.findMany({
      where: { teamId },
      select: { projectId: true },
    });
    for (const { projectId } of teamProjects) {
      await this.propagateMemberToProject(member, projectId, 'member', 'team');
    }
  }

  /**
   * 成员退团队：回收其 team 来源绑定（仍被其他已绑团队覆盖或 direct 的保留）。
   */
  async revokeMemberFromTeamProjects(
    memberId: string,
    teamId: string,
  ): Promise<void> {
    const teamProjects = await this.prisma.teamProject.findMany({
      where: { teamId },
      select: { projectId: true },
    });
    for (const { projectId } of teamProjects) {
      const binding = await this.prisma.memberProjectBinding.findFirst({
        where: { memberId, projectId },
      });
      if (!binding || binding.source === 'direct') continue;
      if (await this.isMemberCoveredByOtherTeams(memberId, projectId, teamId)) {
        continue;
      }
      await this.prisma.memberProjectBinding.delete({
        where: { id: binding.id },
      });
      await this.revokeMemberFromProject(memberId, projectId);
    }
  }

  /** 团队解绑项目：回收团队内成员的 team 来源绑定（direct 与其他团队覆盖的保留） */
  async revokeTeamFromProject(
    teamId: string,
    projectId: string,
  ): Promise<void> {
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId },
      select: { memberId: true },
    });
    for (const { memberId } of teamMembers) {
      const binding = await this.prisma.memberProjectBinding.findFirst({
        where: { memberId, projectId },
      });
      if (!binding || binding.source === 'direct') continue;
      if (await this.isMemberCoveredByOtherTeams(memberId, projectId, teamId)) {
        continue;
      }
      await this.prisma.memberProjectBinding.delete({
        where: { id: binding.id },
      });
      await this.revokeMemberFromProject(memberId, projectId);
    }
    this.logger.log(
      `Team ${teamId} unbound from project ${projectId}: team-sourced bindings reconciled`,
    );
  }

  /** 成员是否仍被其他已绑定该项目的团队覆盖 */
  private async isMemberCoveredByOtherTeams(
    memberId: string,
    projectId: string,
    excludeTeamId: string,
  ): Promise<boolean> {
    const otherTeamProjects = await this.prisma.teamProject.findMany({
      where: { projectId, teamId: { not: excludeTeamId } },
      select: { teamId: true },
    });
    if (otherTeamProjects.length === 0) return false;
    const covered = await this.prisma.teamMember.count({
      where: {
        memberId,
        teamId: { in: otherTeamProjects.map((t) => t.teamId) },
      },
    });
    return covered > 0;
  }
}
