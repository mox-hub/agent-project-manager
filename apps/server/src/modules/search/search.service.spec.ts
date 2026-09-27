import { SearchService } from './search.service';
import { PrismaService } from '../../core/database/prisma.service';
import { SearchQueryDto } from './dto/search.dto';

describe('SearchService', () => {
  let service: SearchService;
  const prismaMock = {
    issue: { findMany: vi.fn().mockResolvedValue([]) },
    document: { findMany: vi.fn().mockResolvedValue([]) },
    project: { findMany: vi.fn().mockResolvedValue([]) },
  };

  const issueRow = (over: Partial<Record<string, unknown>> = {}) => ({
    id: 'i1',
    type: 'task',
    title: '修复登录超时',
    shortId: 'APM-PF-001',
    status: 'in_progress',
    projectId: 'p1',
    updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    project: { name: 'maintenance-exp', projectCode: 'APM-EXP' },
    ...over,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.issue.findMany.mockResolvedValue([]);
    prismaMock.document.findMany.mockResolvedValue([]);
    prismaMock.project.findMany.mockResolvedValue([]);
    service = new SearchService(prismaMock as unknown as PrismaService);
  });

  const query = (over: Partial<SearchQueryDto> = {}): SearchQueryDto =>
    ({ q: 'exp', ...over }) as SearchQueryDto;

  it('三类命中：工单/文档/项目映射为扁平 items（含 type/path/subtitle/projectId）', async () => {
    prismaMock.issue.findMany.mockResolvedValue([
      issueRow(),
      issueRow({ id: 'i2', type: 'bug', shortId: null, projectId: 'p1' }),
    ]);
    prismaMock.document.findMany.mockResolvedValue([
      {
        id: 'd1',
        title: '维护经验手册',
        shortId: 'D1',
        category: 'guide',
        status: 'published',
        projectId: 'p1',
        updatedAt: new Date('2026-09-02T00:00:00.000Z'),
        project: { name: 'maintenance-exp', projectCode: 'APM-EXP' },
      },
    ]);
    prismaMock.project.findMany.mockResolvedValue([
      {
        id: 'p1',
        name: 'maintenance-exp',
        projectCode: 'APM-EXP',
        updatedAt: new Date('2026-09-03T00:00:00.000Z'),
      },
    ]);

    const result = await service.search(query(), 'u1');

    expect(result.total).toBe(4);
    expect(result.items.map((i) => i.type)).toEqual([
      'task',
      'bug',
      'document',
      'project',
    ]);
    expect(result.items[0]).toMatchObject({
      id: 'i1',
      type: 'task',
      title: '修复登录超时',
      path: '/app/issues/i1',
      projectId: 'p1',
      // CAP-A-23：短号 + 项目代码齐备才产出 apm:// 引用串
      apmRef: 'apm://APM-EXP/issue/APM-PF-001',
    });
    // bug → /app/bugs 路由；缺短号引用串为 null 不造假
    expect(result.items[1]).toMatchObject({
      type: 'bug',
      path: '/app/bugs/i2',
      apmRef: null,
    });
    expect(result.items[2]).toMatchObject({
      type: 'document',
      path: '/app/documents/d1',
      apmRef: 'apm://APM-EXP/doc/D1',
    });
    expect(result.items[3]).toMatchObject({
      type: 'project',
      path: '/app/projects/p1',
      projectId: null,
      // apm:// 方言无 project kind，恒 null
      apmRef: null,
    });
  });

  it('apmRef 完整性：缺 projectCode 或短号任一即 null（CAP-A-23）', async () => {
    prismaMock.issue.findMany.mockResolvedValue([
      issueRow({ project: { name: 'no-code', projectCode: null } }),
    ]);
    prismaMock.document.findMany.mockResolvedValue([
      {
        id: 'd2',
        title: '无短号文档',
        shortId: null,
        category: 'guide',
        status: 'draft',
        projectId: 'p1',
        updatedAt: new Date(),
        project: { name: 'n', projectCode: 'APM-EXP' },
      },
    ]);

    const result = await service.search(query(), 'u1');

    expect(result.items[0].apmRef).toBeNull();
    expect(result.items[1].apmRef).toBeNull();
    // 查询需带出 projectCode / shortId 作为引用串原料
    const issueSelect = prismaMock.issue.findMany.mock.calls.at(-1)[0].select;
    expect(issueSelect.project).toEqual({
      select: { name: true, projectCode: true },
    });
    expect(issueSelect.shortId).toBe(true);
    const docSelect = prismaMock.document.findMany.mock.calls.at(-1)[0].select;
    expect(docSelect.project).toEqual({
      select: { name: true, projectCode: true },
    });
    expect(docSelect.shortId).toBe(true);
  });

  it('查询条件：工单 title/shortId/description contains + 项目成员可见性 + 每类上限', async () => {
    await service.search(query({ limit: 50 }), 'u1');

    const issueArgs = prismaMock.issue.findMany.mock.calls[0][0];
    expect(issueArgs.where.project).toEqual({
      members: { some: { userId: 'u1' } },
    });
    expect(issueArgs.where.OR).toEqual([
      { title: { contains: 'exp' } },
      { shortId: { contains: 'exp' } },
      { description: { contains: 'exp' } },
    ]);
    expect(issueArgs.take).toBe(10);

    expect(prismaMock.document.findMany.mock.calls[0][0].where.title).toEqual({
      contains: 'exp',
    });
    expect(prismaMock.project.findMany.mock.calls[0][0].where.members).toEqual({
      some: { userId: 'u1' },
    });
  });

  it('权限过滤：type 过滤只查对应类别，未实现的类别（milestone）不查库不报错', async () => {
    await service.search(query({ types: ['document', 'milestone'] }), 'u1');

    expect(prismaMock.issue.findMany).not.toHaveBeenCalled();
    expect(prismaMock.document.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.project.findMany).not.toHaveBeenCalled();
  });

  it('types=bug 时工单仅查 bug，types=task 时仅查非 bug', async () => {
    await service.search(query({ types: ['bug'] }), 'u1');
    expect(prismaMock.issue.findMany.mock.calls[0][0].where.type).toEqual({
      equals: 'bug',
    });

    await service.search(query({ types: ['task'] }), 'u1');
    expect(prismaMock.issue.findMany.mock.calls[1][0].where.type).toEqual({
      not: 'bug',
    });
  });

  it('空关键词与空命中：不查库 / 返回空 items', async () => {
    const empty = await service.search(query({ q: '  ' }), 'u1');
    expect(empty).toEqual({ items: [], total: 0 });
    expect(prismaMock.issue.findMany).not.toHaveBeenCalled();

    const noHit = await service.search(query({ q: 'zzz-no-hit' }), 'u1');
    expect(noHit).toEqual({ items: [], total: 0 });
  });

  it('只传未实现类别（milestone）：语义为只看该类别 → 空命中且不查库', async () => {
    const result = await service.search(query({ types: ['milestone'] }), 'u1');
    expect(result).toEqual({ items: [], total: 0 });
    expect(prismaMock.issue.findMany).not.toHaveBeenCalled();
    expect(prismaMock.document.findMany).not.toHaveBeenCalled();
    expect(prismaMock.project.findMany).not.toHaveBeenCalled();
  });
});
