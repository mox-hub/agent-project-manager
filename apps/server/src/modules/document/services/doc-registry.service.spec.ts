import { DocRegistryService } from './doc-registry.service';

/**
 * DocRegistry 可重建索引测试（内存桩）：派生字段回填幂等、
 * shortId 稳定性、catalog 聚合、apm:// resolveRef。
 */

interface DocRow {
  id: string;
  projectId: string;
  title: string;
  content: string;
  shortId: string | null;
  sourceChecksum: string | null;
  docRole: string | null;
  provenance: string;
  status: string;
  digestPolicy: string;
  folderId: string | null;
  isDeleted: boolean;
  summary: string | null;
  updatedAt: Date;
  createdAt: Date;
}

interface FolderRow {
  id: string;
  projectId: string;
  name: string;
  slug: string | null;
  parentId: string | null;
}

class StubPrisma {
  docs: DocRow[] = [];
  folders: FolderRow[] = [];
  sequences: Record<string, number> = {};

  get documentFolder() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findMany: async ({ where }: any) =>
        svc.folders.filter((f) => f.projectId === where.projectId),
      update: async ({ where, data }: any) => {
        const found = svc.folders.find((f) => f.id === where.id)!;
        Object.assign(found, data);
        return found;
      },
    };
  }

  get document() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findMany: async ({ where }: any) =>
        svc.docs.filter((d) => d.projectId === where.projectId && !d.isDeleted),
      update: async ({ where, data }: any) => {
        const found = svc.docs.find((d) => d.id === where.id)!;
        Object.assign(found, data);
        return found;
      },
      findFirst: async ({ where }: any) =>
        svc.docs.find(
          (d) =>
            (where.shortId === undefined || d.shortId === where.shortId) &&
            (where.projectId === undefined ||
              d.projectId === where.projectId) &&
            (where.isDeleted === undefined || d.isDeleted === where.isDeleted),
        ) ?? null,
    };
  }

  get globalSequence() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findUnique: async ({ where }: any) =>
        svc.sequences[where.key] !== undefined
          ? { key: where.key, lastSeq: svc.sequences[where.key] }
          : null,
      upsert: async ({ where, create, update }: any) => {
        const current = svc.sequences[where.key];
        if (current !== undefined) {
          svc.sequences[where.key] = update.lastSeq as number;
        } else {
          svc.sequences[where.key] = create.lastSeq as number;
        }
        return { key: where.key, lastSeq: svc.sequences[where.key] };
      },
    };
  }

  async $transaction<T>(fn: (tx: StubPrisma) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

function makeDoc(overrides: Partial<DocRow>): DocRow {
  return {
    id: overrides.id ?? `doc_${Math.random().toString(36).slice(2, 8)}`,
    projectId: 'proj-1',
    title: '文档',
    content: '正文',
    shortId: null,
    sourceChecksum: null,
    docRole: null,
    provenance: 'authored',
    status: 'draft',
    digestPolicy: 'on-demand',
    folderId: null,
    isDeleted: false,
    summary: null,
    updatedAt: new Date('2026-09-08T00:00:00Z'),
    createdAt: new Date('2026-09-08T00:00:00Z'),
    ...overrides,
  };
}

describe('DocRegistryService', () => {
  let svc: DocRegistryService;
  let prisma: StubPrisma;

  beforeEach(() => {
    prisma = new StubPrisma();
    svc = new DocRegistryService(prisma as never);
  });

  describe('rebuildIndex', () => {
    it('回填缺失派生字段：folder slug、doc shortId（D1/D2 递增）、content 指纹', async () => {
      prisma.folders.push({
        id: 'f1',
        projectId: 'proj-1',
        name: '架构设计',
        slug: null,
        parentId: null,
      });
      prisma.docs.push(
        makeDoc({ id: 'd1', title: 'PRD', content: '需求正文' }),
        makeDoc({ id: 'd2', title: '设计', content: '设计正文' }),
      );

      const result = await svc.rebuildIndex('proj-1');
      expect(result).toEqual({ documents: 2, folders: 1 });
      expect(prisma.folders[0].slug).toBe('架构设计');
      expect(prisma.docs[0].shortId).toBe('D1');
      expect(prisma.docs[1].shortId).toBe('D2');
      expect(prisma.docs[0].sourceChecksum).toBe(svc.checksum('需求正文'));
      expect(prisma.sequences['document.shortId']).toBe(2);
    });

    it('幂等：二次 rebuild 零变更（checksum 一致不再写）', async () => {
      prisma.folders.push({
        id: 'f1',
        projectId: 'proj-1',
        name: '指南',
        slug: null,
        parentId: null,
      });
      prisma.docs.push(makeDoc({ id: 'd1', content: '正文' }));
      await svc.rebuildIndex('proj-1');
      const snapshot = JSON.stringify([prisma.docs, prisma.folders]);
      const result = await svc.rebuildIndex('proj-1');
      expect(result).toEqual({ documents: 0, folders: 0 });
      expect(JSON.stringify([prisma.docs, prisma.folders])).toBe(snapshot);
    });

    it('shortId 稳定：已有 shortId / slug 的记录永不变更；内容变更刷新指纹', async () => {
      prisma.docs.push(
        makeDoc({
          id: 'd1',
          shortId: 'D9',
          content: '旧内容',
          sourceChecksum: svc.checksum('旧内容'),
        }),
      );
      await svc.rebuildIndex('proj-1');
      expect(prisma.docs[0].shortId).toBe('D9');
      expect(prisma.docs[0].sourceChecksum).toBe(svc.checksum('旧内容'));

      // 内容修改后再 rebuild：shortId 不变、指纹刷新
      prisma.docs[0].content = '新内容';
      await svc.rebuildIndex('proj-1');
      expect(prisma.docs[0].shortId).toBe('D9');
      expect(prisma.docs[0].sourceChecksum).toBe(svc.checksum('新内容'));
    });

    it('序号自愈：计数器落后时跳过被占用序号', async () => {
      prisma.sequences['document.shortId'] = 5;
      prisma.docs.push(
        makeDoc({ id: 'occupied', shortId: 'D6', content: 'x' }),
        makeDoc({ id: 'newdoc', content: 'y' }),
      );
      await svc.rebuildIndex('proj-1');
      expect(prisma.docs.find((d) => d.id === 'newdoc')?.shortId).toBe('D7');
    });

    it('slug 冲突加后缀；软删除文档不参与索引', async () => {
      prisma.folders.push(
        {
          id: 'f1',
          projectId: 'proj-1',
          name: 'API',
          slug: 'api',
          parentId: null,
        },
        {
          id: 'f2',
          projectId: 'proj-1',
          name: 'API',
          slug: null,
          parentId: null,
        },
      );
      prisma.docs.push(makeDoc({ id: 'dead', isDeleted: true, content: 'x' }));
      const result = await svc.rebuildIndex('proj-1');
      expect(prisma.folders[1].slug).toBe('api-2');
      expect(result.documents).toBe(0);
    });
  });

  describe('getCatalog / resolveRef', () => {
    it('catalog 聚合 slug 路径、角色与治理字段', async () => {
      prisma.folders.push(
        {
          id: 'f1',
          projectId: 'proj-1',
          name: '架构',
          slug: 'arch',
          parentId: null,
        },
        {
          id: 'f2',
          projectId: 'proj-1',
          name: '后端',
          slug: 'backend',
          parentId: 'f1',
        },
      );
      prisma.docs.push(
        makeDoc({
          id: 'd1',
          title: 'PRD v3',
          docRole: 'spec',
          status: 'published',
          folderId: 'f2',
          shortId: 'D1',
          sourceChecksum: 'abc',
          provenance: 'authored',
        }),
      );
      const catalog = await svc.getCatalog('proj-1');
      expect(catalog).toEqual([
        {
          docId: 'd1',
          shortId: 'D1',
          title: 'PRD v3',
          docRole: 'spec',
          provenance: 'authored',
          status: 'published',
          folderPath: 'arch/backend',
          sourceChecksum: 'abc',
          digestPolicy: 'on-demand',
          updatedAt: '2026-09-08T00:00:00.000Z',
        },
      ]);
    });

    it('resolveRef：shortId 命中与未命中', async () => {
      prisma.docs.push(
        makeDoc({ id: 'd1', shortId: 'D1', title: '验收门禁设计' }),
        makeDoc({ id: 'd2', shortId: 'D2', isDeleted: true }),
      );
      const hit = await svc.resolveRef('proj-1', 'D1');
      expect(hit?.title).toBe('验收门禁设计');
      expect(await svc.resolveRef('proj-1', 'D2')).toBeNull();
      expect(await svc.resolveRef('proj-1', 'D99')).toBeNull();
    });
  });

  describe('slugify', () => {
    it('中文保留、危险字符与空白归一、空回退 id 尾段', () => {
      expect(svc.slugify('架构设计 Docs', 'fid')).toBe('架构设计-docs');
      expect(svc.slugify('a/b\\c:d*e?', 'fid')).toBe('a-b-c-d-e');
      expect(svc.slugify('///', 'abc12345')).toBe('folder-c12345');
    });
  });
});
