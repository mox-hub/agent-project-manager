import {
  ContextService,
  aggregateContextFreshness,
  normalizeContextFreshness,
  resolveFreshnessFromAge,
  DEFAULT_FRESH_MAX_AGE_MS,
  DEFAULT_RECENT_MAX_AGE_MS,
} from './context.service';

/**
 * CAP-B-06（上下文时效性）单测：ContextPack freshness 按数据源实龄计算。
 * 覆盖三组断言：实龄→档位映射、unknown 诚实降级、整体取最低档。
 * Prisma 用内存桩（buildContextPack 链上全部为终端 findUnique/findMany 调用）。
 */

const NOW = new Date('2026-09-18T12:00:00.000Z');
const THRESHOLDS = {
  freshMaxAgeMs: DEFAULT_FRESH_MAX_AGE_MS,
  recentMaxAgeMs: DEFAULT_RECENT_MAX_AGE_MS,
};

const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

interface StubRow {
  [key: string]: any;
}

class StubPrisma {
  rows: Record<string, StubRow[] | ((args: any) => StubRow[])> = {};

  stub(model: string, rows: StubRow[] | ((args: any) => StubRow[])) {
    this.rows[model] = rows;
  }

  private resolve(model: string, args: any): StubRow[] {
    const def = this.rows[model];
    if (def == null) return [];
    return typeof def === 'function' ? def(args) : def;
  }

  findUnique(model: string) {
    return async (args: any) => this.resolve(model, args)[0] ?? null;
  }

  findMany(model: string) {
    return async () => this.resolve(model, {});
  }
}

function makePrisma(): Record<string, any> {
  const stub = new StubPrisma();
  const bind = (model: string) => ({
    findUnique: stub.findUnique(model),
    findMany: stub.findMany(model),
  });
  return {
    project: bind('project'),
    issue: bind('issue'),
    milestone: bind('milestone'),
    issueActivity: bind('issueActivity'),
    aIConversation: bind('aIConversation'),
    executionArtifact: bind('executionArtifact'),
    projectWorkspace: bind('projectWorkspace'),
    document: bind('document'),
  };
}

function makeService(prismaOverride?: Record<string, any>): ContextService {
  // 时钟注入为固定 NOW：stub 数据的时间戳全部相对 NOW 构造
  return new ContextService(
    (prismaOverride ?? makePrisma()) as any,
    {} as any,
    () => NOW,
  );
}

describe('resolveFreshnessFromAge（实龄 → 档位）', () => {
  it('10 分钟前 → fresh', () => {
    expect(resolveFreshnessFromAge(minutesAgo(10), NOW, THRESHOLDS)).toBe(
      'fresh',
    );
  });

  it('2 小时前 → recent', () => {
    expect(resolveFreshnessFromAge(hoursAgo(2), NOW, THRESHOLDS)).toBe(
      'recent',
    );
  });

  it('25 小时前 → stale', () => {
    expect(resolveFreshnessFromAge(hoursAgo(25), NOW, THRESHOLDS)).toBe(
      'stale',
    );
  });

  it('阈值边界：正好 1h 算 recent、正好 24h 算 stale（严格小于语义）', () => {
    expect(resolveFreshnessFromAge(hoursAgo(1), NOW, THRESHOLDS)).toBe(
      'recent',
    );
    expect(resolveFreshnessFromAge(hoursAgo(24), NOW, THRESHOLDS)).toBe(
      'stale',
    );
  });

  it('无时间戳（null/undefined/空串）→ unknown，绝不回落 realtime', () => {
    expect(resolveFreshnessFromAge(null, NOW, THRESHOLDS)).toBe('unknown');
    expect(resolveFreshnessFromAge(undefined, NOW, THRESHOLDS)).toBe('unknown');
    expect(resolveFreshnessFromAge('', NOW, THRESHOLDS)).toBe('unknown');
  });

  it('非法日期字符串 → unknown', () => {
    expect(resolveFreshnessFromAge('not-a-date', NOW, THRESHOLDS)).toBe(
      'unknown',
    );
  });

  it('未来时间戳：容差内（1 分钟）按 fresh，超出容差（10 分钟）→ unknown', () => {
    expect(
      resolveFreshnessFromAge(
        new Date(NOW.getTime() + 60_000),
        NOW,
        THRESHOLDS,
      ),
    ).toBe('fresh');
    expect(
      resolveFreshnessFromAge(
        new Date(NOW.getTime() + 10 * 60_000),
        NOW,
        THRESHOLDS,
      ),
    ).toBe('unknown');
  });

  it('ISO 字符串输入与 Date 输入等价', () => {
    const d = hoursAgo(2);
    expect(resolveFreshnessFromAge(d, NOW, THRESHOLDS)).toBe(
      resolveFreshnessFromAge(d.toISOString(), NOW, THRESHOLDS),
    );
  });

  it('阈值可通过参数覆盖', () => {
    expect(
      resolveFreshnessFromAge(hoursAgo(2), NOW, {
        freshMaxAgeMs: 3 * 3_600_000,
        recentMaxAgeMs: 48 * 3_600_000,
      }),
    ).toBe('fresh');
  });
});

describe('aggregateContextFreshness（整体取最低档）', () => {
  it('全 fresh → fresh', () => {
    expect(aggregateContextFreshness(['fresh', 'fresh'])).toBe('fresh');
  });

  it('混合档位取最旧者', () => {
    expect(aggregateContextFreshness(['fresh', 'recent', 'stale'])).toBe(
      'stale',
    );
    expect(aggregateContextFreshness(['fresh', 'recent'])).toBe('recent');
  });

  it('存在 unknown 层时整体上限压到 recent（诚实降级：不得自称 fresh）', () => {
    expect(aggregateContextFreshness(['fresh', 'unknown'])).toBe('recent');
    expect(aggregateContextFreshness(['fresh', 'fresh', 'unknown'])).toBe(
      'recent',
    );
  });

  it('unknown 不拉低已知的 stale/recent 档', () => {
    expect(aggregateContextFreshness(['stale', 'unknown'])).toBe('stale');
    expect(aggregateContextFreshness(['recent', 'unknown'])).toBe('recent');
  });

  it('全部 unknown 或空层 → unknown', () => {
    expect(aggregateContextFreshness(['unknown', 'unknown'])).toBe('unknown');
    expect(aggregateContextFreshness([])).toBe('unknown');
  });
});

describe('normalizeContextFreshness（旧词表兼容）', () => {
  it("'realtime' → 'fresh'（历史恒写口径的读取兼容）", () => {
    expect(normalizeContextFreshness('realtime')).toBe('fresh');
  });

  it('新词表原样通过，未知词表归 unknown', () => {
    expect(normalizeContextFreshness('fresh')).toBe('fresh');
    expect(normalizeContextFreshness('recent')).toBe('recent');
    expect(normalizeContextFreshness('stale')).toBe('stale');
    expect(normalizeContextFreshness('unknown')).toBe('unknown');
    expect(normalizeContextFreshness('whatever')).toBe('unknown');
    expect(normalizeContextFreshness(null)).toBe('unknown');
  });
});

describe('ContextService.buildContextPack（分层 freshness 透出）', () => {
  it('数据源齐全且新鲜 → 各层 fresh、整体 fresh，且不再输出 realtime', async () => {
    const prisma = makePrisma();
    prisma.project.findUnique = async () => ({
      id: 'p1',
      name: '示例项目',
      type: 'web',
      updatedAt: minutesAgo(10),
      members: [],
      aiContext: null,
    });
    prisma.issue.findMany = async () => [
      {
        id: 'i1',
        title: '任务一',
        status: 'in_progress',
        assigneeId: null,
        priority: 'P1',
        updatedAt: minutesAgo(5),
      },
    ];
    prisma.issueActivity.findMany = async () => [
      { type: 'updated', timestamp: minutesAgo(3), summary: '改了状态' },
    ];
    prisma.projectWorkspace.findUnique = async () => ({
      localPath: '/tmp/ws',
      updatedAt: minutesAgo(8),
    });

    const pack = await makeService(prisma).buildContextPack('p1');
    const result = pack as Record<string, any>;

    expect(result.layerFreshness).toEqual({
      system: 'fresh',
      project: 'fresh',
      session: 'unknown', // 无 issueId → 空层诚实标 unknown
      runtime: 'fresh',
    });
    // 存在 unknown 层 → 整体从 fresh 降级为 recent
    expect(result.freshness).toBe('recent');
    expect(JSON.stringify(result)).not.toContain('realtime');
    expect(Number.isNaN(new Date(result.freshnessCheckedAt).getTime())).toBe(
      false,
    );
    // 层数据 shape 保持原样
    expect(result.layers.system.projectName).toBe('示例项目');
    expect(result.layers.project.activeTasks[0].id).toBe('i1');
  });

  it('带 issueId 且会话新鲜 → session 层 fresh', async () => {
    const prisma = makePrisma();
    prisma.project.findUnique = async () => ({
      id: 'p1',
      name: '示例项目',
      type: 'web',
      updatedAt: minutesAgo(10),
      members: [],
      aiContext: null,
    });
    prisma.aIConversation.findMany = async () => [
      {
        id: 'c1',
        updatedAt: minutesAgo(2),
        messages: [
          { id: 'm1', role: 'user', content: '你好', createdAt: minutesAgo(1) },
        ],
      },
    ];
    prisma.projectWorkspace.findUnique = async () => ({
      localPath: '/tmp/ws',
      updatedAt: minutesAgo(8),
    });

    const pack = (await makeService(prisma).buildContextPack(
      'p1',
      'iss-1',
    )) as Record<string, any>;

    expect(pack.layerFreshness.session).toBe('fresh');
    expect(pack.layerFreshness.project).toBe('unknown'); // 无工单无活动 → unknown
    // system/runtime/project 中最旧为 fresh，但 project unknown → 整体 recent
    expect(pack.freshness).toBe('recent');
  });

  it('25 小时前的数据 → 对应层 stale，整体 stale', async () => {
    const prisma = makePrisma();
    prisma.project.findUnique = async () => ({
      id: 'p1',
      name: '示例项目',
      type: 'web',
      updatedAt: hoursAgo(25),
      members: [],
      aiContext: null,
    });
    prisma.projectWorkspace.findUnique = async () => ({
      localPath: '/tmp/ws',
      updatedAt: hoursAgo(30),
    });

    const pack = (await makeService(prisma).buildContextPack('p1')) as Record<
      string,
      any
    >;

    expect(pack.layerFreshness.system).toBe('stale');
    expect(pack.layerFreshness.runtime).toBe('stale');
    expect(pack.freshness).toBe('stale');
  });

  it('project 不存在且无 workspace、无 issueId → 全层 unknown，整体 unknown（诚实降级）', async () => {
    const prisma = makePrisma();
    // 全部模型默认空

    const pack = (await makeService(prisma).buildContextPack(
      'ghost',
    )) as Record<string, any>;

    expect(pack.layerFreshness).toEqual({
      system: 'unknown',
      project: 'unknown',
      session: 'unknown',
      runtime: 'unknown',
    });
    expect(pack.freshness).toBe('unknown');
    expect(JSON.stringify(pack)).not.toContain('realtime');
  });

  it('session 层取会话 updatedAt 与最新消息 createdAt 的较大者', async () => {
    const prisma = makePrisma();
    prisma.project.findUnique = async () => ({
      id: 'p1',
      name: '示例项目',
      type: 'web',
      updatedAt: minutesAgo(10),
      members: [],
      aiContext: null,
    });
    // 会话本体 25h 前，但最新消息 2 分钟前 → 层基准取较大者，按 fresh 计
    // （不被陈旧的会话 updatedAt 拖成 stale）
    prisma.aIConversation.findMany = async () => [
      {
        id: 'c1',
        updatedAt: hoursAgo(25),
        messages: [
          {
            id: 'm1',
            role: 'assistant',
            content: '新消息',
            createdAt: minutesAgo(2),
          },
        ],
      },
    ];

    const pack = (await makeService(prisma).buildContextPack(
      'p1',
      'iss-9',
    )) as Record<string, any>;

    expect(pack.layerFreshness.session).toBe('fresh');
  });

  it('层基准取各数据源中最新者（任务 5 分钟前、活动 3 小时前 → recent 档内取 fresh）', async () => {
    const prisma = makePrisma();
    prisma.project.findUnique = async () => ({
      id: 'p1',
      name: '示例项目',
      type: 'web',
      updatedAt: minutesAgo(10),
      members: [],
      aiContext: null,
    });
    prisma.issue.findMany = async () => [
      {
        id: 'i1',
        title: '任务一',
        status: 'todo',
        assigneeId: null,
        priority: 'P2',
        updatedAt: minutesAgo(5),
      },
    ];
    prisma.issueActivity.findMany = async () => [
      { type: 'created', timestamp: hoursAgo(3), summary: '早期活动' },
    ];

    const pack = (await makeService(prisma).buildContextPack('p1')) as Record<
      string,
      any
    >;

    expect(pack.layerFreshness.project).toBe('fresh');
  });
});
