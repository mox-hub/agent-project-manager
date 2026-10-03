import { QuickJudgeService } from './quick-judge.service';

/** CAP-A-27 quick-judge 通道：降级纪律（绝不抛）+ 协议形态 + 记账 */

function buildDeps(
  overrides: {
    settings?: Record<string, unknown>;
    slot?: Record<string, unknown> | null;
    fetchImpl?: typeof fetch;
  } = {},
) {
  const usageLogs: Array<Record<string, any>> = [];
  const prisma = {
    aIProviderConfig: {
      findFirst: vi.fn(async () =>
        overrides.slot === undefined
          ? { provider: 'opencode-go', apiKeyEnc: 'enc-key' }
          : overrides.slot,
      ),
    },
    aIUsageLog: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => {
        usageLogs.push(data);
        return data;
      }),
    },
  };
  const logger = { setContext: vi.fn(), warn: vi.fn(), log: vi.fn() };
  const encryption = { decrypt: vi.fn(() => 'plain-key') };
  const settings = {
    getSettings: vi.fn(async () => ({
      enabled: true,
      provider: 'opencode-go',
      model: 'jev-1.13-free',
      baseUrl: 'https://opencode.ai/zen/v1',
      timeoutMs: 8000,
      ...overrides.settings,
    })),
  };
  const service = new QuickJudgeService(
    prisma as any,
    logger as any,
    encryption as any,
    settings as any,
  );
  return { service, prisma, usageLogs, settings };
}

const QUESTIONS = [
  {
    id: 'risk_level',
    type: 'choice' as const,
    instructions: '风险等级？',
    criteria: { read: '只读' },
  },
  { id: 'safe', type: 'noul' as const, instructions: '可自动批？' },
];

const OK_RESPONSE = {
  model: 'jev-1.13-free',
  answers: {
    risk_level: {
      type: 'choice',
      choice: 'write',
      confidence: 0.63,
      probabilities: { read: 0.1, write: 0.75 },
    },
    safe: { type: 'noul', noul: 0.44 },
  },
  usage: { input_tokens: 475, output_tokens: 59 },
};

describe('QuickJudgeService（CAP-A-27 通道）', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('通道未启用 → 直接返回 null 且不发请求（降级纪律）', async () => {
    const { service } = buildDeps({ settings: { enabled: false } });
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await service.judge('approval_risk', 'state', QUESTIONS);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('provider 槽位缺失/无 key → null', async () => {
    const { service } = buildDeps({ slot: null });
    vi.stubGlobal('fetch', vi.fn());

    const result = await service.judge('approval_risk', 'state', QUESTIONS);

    expect(result).toBeNull();
  });

  it('未注册场景 → null（场景注册表纪律）', async () => {
    const { service } = buildDeps();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await service.judge('unknown_scenario', 'state', QUESTIONS);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('成功 → 类型化 answers + questions 以问题 ID 为键的对象发出（数组形态是 422 坑）', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify(OK_RESPONSE), { status: 200 }),
    );
    const { service } = buildDeps({ fetchImpl });
    vi.stubGlobal('fetch', fetchImpl);

    const result = await service.judge(
      'approval_risk',
      '审批请求：x',
      QUESTIONS,
    );

    expect(result).not.toBeNull();
    expect(result!.answers.risk_level.choice).toBe('write');
    expect(result!.answers.safe.noul).toBe(0.44);
    expect(result!.usage).toEqual({ inputTokens: 475, outputTokens: 59 });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://opencode.ai/zen/v1/systemone');
    const body = JSON.parse(init.body);
    expect(body.model).toBe('jev-1.13-free');
    expect(Array.isArray(body.questions)).toBe(false);
    expect(Object.keys(body.questions)).toEqual(['risk_level', 'safe']);
    expect(body.questions.risk_level.criteria).toEqual({ read: '只读' });
    expect(init.headers['x-opencode-session']).toBeTruthy();
    expect(init.headers.Authorization).toBe('Bearer plain-key');
  });

  it('成功 → AIUsageLog 记账 kind=judge（usage 回显入账）', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify(OK_RESPONSE), { status: 200 }),
    );
    const { service, usageLogs } = buildDeps({ fetchImpl });
    vi.stubGlobal('fetch', fetchImpl);

    await service.judge('approval_risk', 'state', QUESTIONS);

    expect(usageLogs).toHaveLength(1);
    expect(usageLogs[0]).toMatchObject({
      modelName: 'jev-1.13-free',
      provider: 'opencode-go',
      promptTokens: 475,
      completionTokens: 59,
      totalTokens: 534,
      estimatedCost: null,
    });
    expect(usageLogs[0].responseMetadata).toEqual({
      kind: 'judge',
      scenario: 'approval_risk',
    });
  });

  it('HTTP 错误 → null（不抛）', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { message: 'Model is unavailable.' } }),
          { status: 400 },
        ),
    );
    const { service, usageLogs } = buildDeps({ fetchImpl });
    vi.stubGlobal('fetch', fetchImpl);

    const result = await service.judge('approval_risk', 'state', QUESTIONS);

    expect(result).toBeNull();
    expect(usageLogs).toHaveLength(0);
  });

  it('网络异常/超时 → null（不抛，降级由调用方回落规则层）', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network unreachable');
    });
    const { service } = buildDeps({ fetchImpl });
    vi.stubGlobal('fetch', fetchImpl);

    await expect(
      service.judge('approval_risk', 'state', QUESTIONS),
    ).resolves.toBeNull();
  });

  it('响应缺 answers → null', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ model: 'jev-1.13-free' }), {
          status: 200,
        }),
    );
    const { service } = buildDeps({ fetchImpl });
    vi.stubGlobal('fetch', fetchImpl);

    expect(await service.judge('approval_risk', 'state', QUESTIONS)).toBeNull();
  });
});
