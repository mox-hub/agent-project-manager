import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { TaskAssigneeService } from './task-assignee.service';

export interface MemberCardDto {
  id: string;
  type: string;
  displayName: string;
  handle: string | null;
  email: string | null;
  avatarUrl: string | null;
  status: string;
  metadata: Record<string, unknown> | null;
  userId: string | null;
  aiModelConfigId: string | null;
  projects: Array<{
    projectId: string;
    role: string;
  }>;
  teams: Array<{
    teamId: string;
    role: string;
  }>;
}

@Injectable()
export class MemberCardService {
  private readonly logger = new Logger(MemberCardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly taskAssigneeService: TaskAssigneeService,
  ) {}

  async getCard(memberId: string, projectId?: string): Promise<MemberCardDto> {
    const m = await this.prisma.member.findUnique({
      where: { id: memberId },
    });
    if (!m) throw new NotFoundException('Member not found');

    const [bindings, teams] = await Promise.all([
      this.prisma.memberProjectBinding.findMany({
        where: { memberId, ...(projectId ? { projectId } : {}) },
      }),
      this.prisma.teamMember.findMany({
        where: { memberId },
      }),
    ]);

    return {
      id: m.id,
      type: m.type,
      displayName: m.displayName,
      handle: m.handle,
      email: m.email,
      avatarUrl: m.avatarUrl,
      status: m.status,
      metadata: m.metadata as Record<string, unknown> | null,
      userId: m.userId,
      aiModelConfigId: m.aiModelConfigId,
      projects: bindings.map((b) => ({
        projectId: b.projectId,
        role: b.role,
      })),
      teams: teams.map((t) => ({
        teamId: t.teamId,
        role: t.role,
      })),
    };
  }

  async getCardBatch(memberIds: string[], projectId?: string) {
    const results = await Promise.all(
      memberIds.map(async (id) => {
        try {
          return await this.getCard(id, projectId);
        } catch (e) {
          this.logger.warn(`getCard failed for ${id}`, e);
          return null;
        }
      }),
    );
    return results.filter(Boolean);
  }
}
