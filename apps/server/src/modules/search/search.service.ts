import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import {
  SearchCategory,
  SearchHitDto,
  SearchQueryDto,
  SearchResponseDto,
} from './dto/search.dto';

/** 每类返回上限（前端 hook 传 limit=50，此处按能力清单口径封顶 10/类） */
const PER_CATEGORY_LIMIT = 10;

const KNOWN_CATEGORIES: SearchCategory[] = [
  'task',
  'bug',
  'document',
  'project',
];

/**
 * 全局搜索（P0-4 死链收口）：工单（task/bug）/ 文档 / 项目三类，
 * 统一「项目成员可见性」口径（与 issue.service.findAccessibleTasks 一致：
 * project.members.some(userId)，SQLite contains→LIKE 对 ASCII 天然大小写不敏感）。
 * 响应形状对齐前端契约 apps/frontend/src/modules/search/api/search-api.ts
 * （扁平 items，前端自行按 type 分组；milestone/acceptance 类别后端暂不产出命中）。
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    query: SearchQueryDto,
    userId: string,
  ): Promise<SearchResponseDto> {
    const q = (query.q ?? '').trim();
    if (!q) return { items: [], total: 0 };

    const categories = this.normalizeTypes(query.types);
    const take = this.resolveTake(query.limit);
    // 可见性口径：用户必须是项目成员（ProjectMember.userId），同 /issues/accessible
    const projectVisibility = { members: { some: { userId } } };

    const wants = (c: SearchCategory) => !categories || categories.has(c);

    const [issues, documents, projects] = await Promise.all([
      wants('task') || wants('bug')
        ? this.prisma.issue.findMany({
            where: {
              project: projectVisibility,
              ...this.issueTypeFilter(wants('task'), wants('bug')),
              OR: [
                { title: { contains: q } },
                { shortId: { contains: q } },
                { description: { contains: q } },
              ],
            },
            select: {
              id: true,
              type: true,
              title: true,
              shortId: true,
              status: true,
              projectId: true,
              updatedAt: true,
              project: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take,
          })
        : Promise.resolve([]),
      wants('document')
        ? this.prisma.document.findMany({
            where: {
              isDeleted: false,
              project: projectVisibility,
              title: { contains: q },
            },
            select: {
              id: true,
              title: true,
              category: true,
              status: true,
              projectId: true,
              updatedAt: true,
              project: { select: { name: true } },
            },
            orderBy: { updatedAt: 'desc' },
            take,
          })
        : Promise.resolve([]),
      wants('project')
        ? this.prisma.project.findMany({
            where: {
              members: { some: { userId } },
              OR: [{ name: { contains: q } }, { description: { contains: q } }],
            },
            select: {
              id: true,
              name: true,
              projectCode: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
            take,
          })
        : Promise.resolve([]),
    ]);

    const items = [
      ...issues.map((i) => this.issueHit(i)),
      ...documents.map((d) => this.documentHit(d)),
      ...projects.map((p) => this.projectHit(p)),
    ];

    return { items, total: items.length };
  }

  /** issues 的 task/bug 拆分过滤；两者都要时不过滤（含遗留其它 type，前端映射为 task） */
  private issueTypeFilter(wantTask: boolean, wantBug: boolean) {
    if (wantTask && wantBug) return {};
    if (wantBug) return { type: { equals: 'bug' } };
    return { type: { not: 'bug' } };
  }

  /**
   * 类别过滤归一：
   * - 未传 → null（查全部已实现类别）；
   * - 传了但含未实现类别（milestone/acceptance 等）→ 仅保留已实现子集；
   * - 传了且全部未实现 → 空集合（语义是「只看该类别」，命中为空而非回落全量）。
   */
  private normalizeTypes(types: unknown): Set<SearchCategory> | null {
    const raw = Array.isArray(types)
      ? types
      : typeof types === 'string'
        ? [types]
        : [];
    if (raw.length === 0) return null;
    const known = raw.filter((v): v is SearchCategory =>
      (KNOWN_CATEGORIES as string[]).includes(String(v)),
    );
    return new Set(known);
  }

  private resolveTake(limit?: number): number {
    const n = Number(limit);
    if (!Number.isFinite(n) || n <= 0) return PER_CATEGORY_LIMIT;
    return Math.min(Math.floor(n), PER_CATEGORY_LIMIT);
  }

  private issueHit(issue: {
    id: string;
    type: string;
    title: string;
    shortId: string | null;
    status: string;
    projectId: string | null;
    updatedAt: Date;
    project: { name: string } | null;
  }): SearchHitDto {
    const isBug = issue.type === 'bug';
    return {
      id: issue.id,
      type: isBug ? 'bug' : 'task',
      title: issue.title,
      subtitle: [issue.project?.name, issue.shortId ?? issue.status]
        .filter(Boolean)
        .join(' · '),
      path: isBug ? `/app/bugs/${issue.id}` : `/app/issues/${issue.id}`,
      updatedAt: issue.updatedAt.toISOString(),
      projectId: issue.projectId,
    };
  }

  private documentHit(doc: {
    id: string;
    title: string;
    category: string;
    status: string;
    projectId: string | null;
    updatedAt: Date;
    project: { name: string } | null;
  }): SearchHitDto {
    return {
      id: doc.id,
      type: 'document',
      title: doc.title,
      subtitle: [doc.project?.name ?? doc.category, doc.status]
        .filter(Boolean)
        .join(' · '),
      path: `/app/documents/${doc.id}`,
      updatedAt: doc.updatedAt.toISOString(),
      projectId: doc.projectId,
    };
  }

  private projectHit(project: {
    id: string;
    name: string;
    projectCode: string | null;
    updatedAt: Date;
  }): SearchHitDto {
    return {
      id: project.id,
      type: 'project',
      title: project.name,
      subtitle: project.projectCode ?? '',
      path: `/app/projects/${project.id}`,
      updatedAt: project.updatedAt.toISOString(),
      projectId: null,
    };
  }
}
