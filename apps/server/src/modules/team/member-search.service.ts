import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

@Injectable()
export class MemberSearchService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 全局成员搜索（按 displayName/handle/email 模糊匹配）
   */
  async search(
    q: string,
    opts: {
      type?: string;
      projectId?: string;
      teamId?: string;
      limit?: number;
    },
  ) {
    if (!q || q.length < 1) return [];

    const where: any = {
      status: { not: 'inactive' },
    };
    if (opts.type) where.type = opts.type;

    where.OR = [
      { displayName: { contains: q } },
      { handle: { contains: q } },
      { email: { contains: q } },
    ];

    // Get project member IDs if projectId is specified
    if (opts.projectId) {
      const bindings = await this.prisma.memberProjectBinding.findMany({
        where: { projectId: opts.projectId },
        select: { memberId: true },
      });
      const memberIds = bindings.map((b) => b.memberId);
      if (memberIds.length > 0) {
        where.id = { in: memberIds };
      }
    }

    // Get team member IDs if teamId is specified
    if (opts.teamId) {
      const memberships = await this.prisma.teamMember.findMany({
        where: { teamId: opts.teamId },
        select: { memberId: true },
      });
      const memberIds = memberships.map((m) => m.memberId);
      if (memberIds.length > 0) {
        if (where.id) {
          // Intersect with project filter
          where.id = {
            in: (where.id.in as string[]).filter((id) =>
              memberIds.includes(id),
            ),
          };
        } else {
          where.id = { in: memberIds };
        }
      }
    }

    return this.prisma.member.findMany({
      where,
      select: {
        id: true,
        type: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        email: true,
      },
      orderBy: [{ type: 'asc' }, { displayName: 'asc' }],
      take: opts.limit ?? 20,
    });
  }
}
