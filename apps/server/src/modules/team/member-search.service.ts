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
    if (opts.projectId) {
      where.projectBindings = { some: { projectId: opts.projectId } };
    }
    if (opts.teamId) {
      where.teamMemberships = { some: { teamId: opts.teamId } };
    }
    where.OR = [
      { displayName: { contains: q } },
      { handle: { contains: q } },
      { email: { contains: q } },
    ];

    return this.prisma.member.findMany({
      where,
      select: {
        id: true,
        type: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
        status: true,
        isOnline: true,
        email: true,
        user: { select: { id: true, username: true, avatarUrl: true } },
        aiModelConfig: { select: { id: true, name: true, provider: true } },
      },
      orderBy: [{ type: 'asc' }, { displayName: 'asc' }],
      take: opts.limit ?? 20,
    });
  }
}
