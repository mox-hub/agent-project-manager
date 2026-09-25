import { ContextBuilderService } from './context-builder.service';
import { DocRegistryService } from '../../document/services/doc-registry.service';

/**
 * dispatch 管线 docs provider（v2 纪要 §9 通道 B）：projectKnowledge 段
 * 从 Registry catalog + 命中 digest 拼装，永不装正文。
 *
 * P2-23 增补：buildTaskExecutionContext 的 enrichment（文档/记忆/历史教训
 * 三来源 + token 预算截断 + 来源缺失诚实降级）。
 */

class StubRegistry {
  catalog: any[] = [];
  subsets = new Map<string, any>();
  getCatalog = async () => this.catalog;
  getSubset = async (docId: string) => this.subsets.get(docId) ?? null;
}

class StubMemory {
  atoms: any[] = [];
  shouldThrow = false;
  recall = async () => {
    if (this.shouldThrow) throw new Error('memory boom');
    return this.atoms;
  };
}

function makeService(registry: StubRegistry, memory?: StubMemory) {
  const prisma = { project: { findUnique: async () => null } };
  return new ContextBuilderService(
    prisma as never,
    registry as unknown as DocRegistryService,
    (memory ?? new StubMemory()) as never,
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

/** 构造 buildTaskExecutionContext 所需的最小 issue 形状 */
function makeIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'issue-1',
    title: '实现导出功能',
    description: '按需求导出 CSV',
    status: 'in_progress',
    priority: 'high',
    assignee: null,
    reporter: null,
    issueTags: [],
    dependencies: [],
    subIssues: [],
    acceptances: [],
    ...overrides,
  };
}

/** 构造带 enrichment 依赖 stub 的服务 */
function makeExecService(options: {
  issue?: Record<string, unknown> | null;
  executions?: any[];
  memory?: StubMemory;
  registry?: StubRegistry;
}) {
  const prisma = {
    issue: {
      findUnique: async () =>
        options.issue === undefined ? makeIssue() : options.issue,
    },
    projectAIContext: { findUnique: async () => null },
    execution: { findMany: async () => options.executions ?? [] },
  };
  const memory = options.memory ?? new StubMemory();
  const registry = options.registry ?? new StubRegistry();
  const svc = new ContextBuilderService(
    prisma as never,
    registry as unknown as DocRegistryService,
    memory as never,
  );
  return { svc, memory, registry };
}

describe('ContextBuilderService.buildTaskExecutionContext（P2-23 enrichment）', () => {
  it('三来源齐备：enrichment 拼装文档/记忆/历史教训三段', async () => {
    const registry = new StubRegistry();
    registry.catalog = [
      {
        docId: 'd1',
        shortId: 'D1',
        title: '导出设计',
        docRole: 'design',
        status: 'published',
        folderPath: '',
        sourceChecksum: null,
        digestPolicy: 'off',
        updatedAt: '2026-09-08T00:00:00.000Z',
        provenance: 'authored',
      },
    ];
    const memory = new StubMemory();
    memory.atoms = [
      {
        id: 'm1',
        scope: 'project:p1',
        type: 'conclusion',
        slot: 'conventions',
        content: '导出文件统一放 /exports 目录',
        confidence: 0.9,
        lifecycle: 'working',
        pinned: false,
        hits: 1,
        lastUsedAt: null,
        createdAt: new Date(),
      },
    ];
    const { svc } = makeExecService({
      issue: makeIssue(),
      executions: [
        {
          goal: '跑导出测试',
          title: '导出执行',
          status: 'failed',
          errorDetail: { message: 'Error: ENOENT: no such file' },
          input: {},
          updatedAt: new Date(),
        },
      ],
      memory,
      registry,
    });

    const ctx = await svc.buildTaskExecutionContext('issue-1', 'proj-1');
    expect(ctx).not.toBeNull();
    expect(ctx!.enrichment).not.toBeNull();
    expect(ctx!.enrichment.text).toContain('## 项目知识文档');
    expect(ctx!.enrichment.text).toContain('导出设计');
    expect(ctx!.enrichment.text).toContain('## 项目记忆');
    expect(ctx!.enrichment.text).toContain('导出文件统一放 /exports 目录');
    expect(ctx!.enrichment.text).toContain('## 历史教训');
    expect(ctx!.enrichment.text).toContain('environment');
    expect(ctx!.enrichment.included).toEqual(['docs', 'memories', 'lessons']);
    expect(ctx!.enrichment.truncated).toEqual([]);
  });

  it('全部来源缺失：enrichment 为 null，不注空段', async () => {
    const { svc } = makeExecService({ issue: makeIssue() });
    const ctx = await svc.buildTaskExecutionContext('issue-1', 'proj-1');
    expect(ctx!.enrichment).toBeNull();
  });

  it('来源缺失时诚实降级：记忆服务抛错不炸派发，其余来源照常装入', async () => {
    const memory = new StubMemory();
    memory.shouldThrow = true;
    const registry = new StubRegistry();
    registry.catalog = [
      {
        docId: 'd1',
        shortId: 'D1',
        title: '仅有文档',
        docRole: null,
        status: 'published',
        folderPath: '',
        sourceChecksum: null,
        digestPolicy: 'off',
        updatedAt: '2026-09-08T00:00:00.000Z',
        provenance: 'authored',
      },
    ];
    const { svc } = makeExecService({ issue: makeIssue(), memory, registry });
    const ctx = await svc.buildTaskExecutionContext('issue-1', 'proj-1');
    expect(ctx!.enrichment).not.toBeNull();
    expect(ctx!.enrichment.included).toEqual(['docs']);
    expect(ctx!.enrichment.text).not.toContain('## 项目记忆');
  });

  it('历史教训：无错误留痕的失败执行不产出条目（无信号不猜）', async () => {
    const { svc } = makeExecService({
      issue: makeIssue(),
      executions: [
        {
          goal: '静默失败',
          title: '静默失败',
          status: 'failed',
          errorDetail: null,
          input: null,
          updatedAt: new Date(),
        },
      ],
    });
    const ctx = await svc.buildTaskExecutionContext('issue-1', 'proj-1');
    // 无文档、无记忆、教训无信号 → 整体为 null
    expect(ctx!.enrichment).toBeNull();
  });

  it('token 预算截断：预算调小时低优先级段标 truncated', async () => {
    process.env['CONTEXT_ENRICHMENT_BUDGET_TOKENS'] = '30';
    try {
      const registry = new StubRegistry();
      registry.catalog = [
        {
          docId: 'd1',
          shortId: 'D1',
          title: '大文档',
          docRole: null,
          status: 'published',
          folderPath: '',
          sourceChecksum: null,
          digestPolicy: 'off',
          updatedAt: '2026-09-08T00:00:00.000Z',
          provenance: 'authored',
        },
      ];
      registry.subsets.set('d1', {
        digest: {
          summary: '很长的摘要'.repeat(40),
          keyPoints: [],
          anchors: [],
        },
        freshness: 'cached',
      });
      const memory = new StubMemory();
      memory.atoms = [
        {
          id: 'm1',
          scope: 'project:p1',
          type: 'conclusion',
          slot: null,
          content: 'b'.repeat(200),
          confidence: 0.9,
          lifecycle: 'working',
          pinned: false,
          hits: 0,
          lastUsedAt: null,
          createdAt: new Date(),
        },
      ];
      const { svc } = makeExecService({
        issue: makeIssue(),
        memory,
        registry,
      });
      const ctx = await svc.buildTaskExecutionContext('issue-1', 'proj-1');
      expect(ctx!.enrichment).not.toBeNull();
      expect(ctx!.enrichment.truncated.length).toBeGreaterThan(0);
      expect(ctx!.enrichment.text).toContain('已按 token 预算截断');
    } finally {
      delete process.env['CONTEXT_ENRICHMENT_BUDGET_TOKENS'];
    }
  });

  it('task 不存在：仍返回 null（富化不改变既有契约）', async () => {
    const { svc } = makeExecService({ issue: null });
    const ctx = await svc.buildTaskExecutionContext('missing', 'proj-1');
    expect(ctx).toBeNull();
  });
});
