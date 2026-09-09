import { ContextBuilderService } from './context-builder.service';
import { DocRegistryService } from '../../document/services/doc-registry.service';

/**
 * dispatch 管线 docs provider（v2 纪要 §9 通道 B）：projectKnowledge 段
 * 从 Registry catalog + 命中 digest 拼装，永不装正文。
 */

class StubRegistry {
  catalog: any[] = [];
  subsets = new Map<string, any>();
  getCatalog = async () => this.catalog;
  getSubset = async (docId: string) => this.subsets.get(docId) ?? null;
}

function makeService(registry: StubRegistry) {
  const prisma = { project: { findUnique: async () => null } };
  return new ContextBuilderService(
    prisma as never,
    registry as unknown as DocRegistryService,
  );
}

describe('ContextBuilderService.getProjectKnowledge（docs provider）', () => {
  it('拼装 catalog 清单 + ready digest 摘要', async () => {
    const registry = new StubRegistry();
    registry.catalog = [
      {
        docId: 'd1',
        shortId: 'D1',
        title: '验收门禁设计',
        docRole: 'design',
        status: 'published',
        folderPath: 'arch',
        sourceChecksum: 'x',
        digestPolicy: 'on-demand',
        updatedAt: '2026-09-08T00:00:00.000Z',
        provenance: 'authored',
      },
      {
        docId: 'd2',
        shortId: 'D2',
        title: '旧笔记',
        docRole: null,
        status: 'draft',
        folderPath: '',
        sourceChecksum: null,
        digestPolicy: 'off',
        updatedAt: '2026-09-01T00:00:00.000Z',
        provenance: 'authored',
      },
    ];
    registry.subsets.set('d1', {
      digest: { summary: '验收闭环四项设计。', keyPoints: [], anchors: [] },
      freshness: 'cached',
    });

    const svc = makeService(registry);
    const result = await svc.buildContext({
      projectId: 'proj-1',
      includeProjectKnowledge: true,
    });

    expect(result.projectKnowledge).toContain('## 项目知识文档');
    expect(result.projectKnowledge).toContain('验收门禁设计 [design]');
    expect(result.projectKnowledge).toContain('doc/D1');
    expect(result.projectKnowledge).toContain('摘要: 验收闭环四项设计。');
    expect(result.projectKnowledge).toContain('旧笔记');
  });

  it('空 catalog 返回空串；off 策略文档不取 digest', async () => {
    const registry = new StubRegistry();
    registry.catalog = [];
    const svc = makeService(registry);
    const empty = await svc.buildContext({
      projectId: 'proj-1',
      includeProjectKnowledge: true,
    });
    expect(empty.projectKnowledge).toBe('');
  });
});
