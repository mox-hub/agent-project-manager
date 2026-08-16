import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { CreateMentionDto, ParseMentionsDto } from './dto/mention.dto';

@Injectable()
export class MentionService {
  private readonly logger = new Logger(MentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  private HANDLE_REGEX = /@([a-zA-Z0-9_\-.]+)/g;

  async create(dto: CreateMentionDto) {
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });
    if (!member) throw new NotFoundException('Member not found');
    return this.prisma.mention.create({
      data: {
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        memberId: dto.memberId,
        content: dto.context || '',
      },
    });
  }

  async listByMember(memberId: string, limit = 20) {
    return this.prisma.mention.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async listBySource(sourceType: string, sourceId: string) {
    const mentions = await this.prisma.mention.findMany({
      where: { sourceType, sourceId },
      orderBy: { createdAt: 'desc' },
    });

    // 手动获取Member信息
    const memberIds = [
      ...new Set(mentions.map((m) => m.memberId).filter(Boolean)),
    ];
    const members = await this.prisma.member.findMany({
      where: { id: { in: memberIds as string[] } },
      select: {
        id: true,
        type: true,
        displayName: true,
        handle: true,
        avatarUrl: true,
      },
    });
    const memberMap = new Map(members.map((m) => [m.id, m]));

    return mentions.map((mention) => ({
      ...mention,
      member: mention.memberId ? memberMap.get(mention.memberId) : undefined,
    }));
  }

  /**
   * 解析文本中的 @handle 引用并创建 Mention 记录
   */
  async parseAndCreate(dto: ParseMentionsDto, mentionerId?: string) {
    const handles = Array.from(
      new Set(
        Array.from(dto.text.matchAll(this.HANDLE_REGEX)).map((m) => m[1]),
      ),
    );
    if (!handles.length) return { created: 0, members: [] };

    const members = await this.prisma.member.findMany({
      where: { handle: { in: handles } },
      select: { id: true, handle: true, displayName: true },
    });
    if (!members.length) return { created: 0, members: [] };

    const records = [];
    for (const m of members) {
      records.push({
        sourceType: dto.sourceType,
        sourceId: dto.sourceId,
        memberId: m.id,
        content: dto.text.slice(0, 200),
      });
    }

    for (const record of records) {
      await this.prisma.mention.create({ data: record });
    }

    return { created: members.length, members };
  }

  /**
   * 供前端 @ 自动补全使用：按 handle 前缀模糊匹配
   */
  async suggest(q: string, limit = 8) {
    if (!q) return [];
    return this.prisma.member.findMany({
      where: {
        status: { not: 'inactive' },
        OR: [{ handle: { startsWith: q } }, { displayName: { contains: q } }],
      },
      select: {
        id: true,
        type: true,
        handle: true,
        displayName: true,
        avatarUrl: true,
      },
      orderBy: [{ handle: 'asc' }],
      take: limit,
    });
  }
}
