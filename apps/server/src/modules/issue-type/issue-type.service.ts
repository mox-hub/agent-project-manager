import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateIssueTypeDto, UpdateIssueTypeDto } from './dto/issue-type.dto';

// 内置不可删类型：所有任务的缺省类型
export const BUILTIN_LOCKED_TYPE_KEY = 'task';

/**
 * 工单类型适配引擎 —— 类型元数据的唯一事实源。
 * Task.typeId 指向本表；icon/color/name 由本表驱动前端渲染，
 * 自定义类型与内置类型（task/bug）走同一套读写路径。
 */
@Injectable()
export class IssueTypeService {
  constructor(private readonly prisma: PrismaService) {}

  list(withUsage = false) {
    return this.prisma.issueType.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      ...(withUsage
        ? {
            include: {
              _count: { select: { issues: true } },
            },
          }
        : {}),
    });
  }

  async create(dto: CreateIssueTypeDto) {
    const existing = await this.prisma.issueType.findUnique({
      where: { key: dto.key },
    });
    if (existing) {
      throw new ConflictException(`类型 key 已存在: ${dto.key}`);
    }
    return this.prisma.issueType.create({
      data: {
        key: dto.key,
        name: dto.name,
        icon: dto.icon ?? 'Circle',
        color: dto.color ?? '#5E6AD2',
        order: dto.order ?? 100,
      },
    });
  }

  async update(id: string, dto: UpdateIssueTypeDto) {
    await this.ensureExists(id);
    return this.prisma.issueType.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    const type = await this.ensureExists(id);
    if (type.key === BUILTIN_LOCKED_TYPE_KEY) {
      throw new BadRequestException('内置类型 task 不可删除');
    }
    const usage = await this.prisma.issue.count({ where: { typeId: id } });
    if (usage > 0) {
      throw new ConflictException(
        `仍有 ${usage} 个任务使用该类型，请先迁移后再删除`,
      );
    }
    await this.prisma.issueType.delete({ where: { id } });
    return { deleted: true };
  }

  /** 按 key 解析类型（适配旧 type 字符串 → typeId 的桥接） */
  async resolveIdByKey(key: string): Promise<string | null> {
    const type = await this.prisma.issueType.findUnique({
      where: { key },
      select: { id: true },
    });
    return type?.id ?? null;
  }

  private async ensureExists(id: string) {
    const type = await this.prisma.issueType.findUnique({ where: { id } });
    if (!type) {
      throw new NotFoundException(`类型不存在: ${id}`);
    }
    return type;
  }
}
