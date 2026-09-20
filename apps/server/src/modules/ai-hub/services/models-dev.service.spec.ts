import { ModelsDevService } from './models-dev.service';

/**
 * CAP-A-21：models.dev 价目参考源单测。
 * 夹具取自 models.dev api.json 实测数据（2026-09-19 抓取，真实价目非臆造）；
 * fetch 以 stubGlobal 隔离——本套件零真实网络调用。
 */

const FIXTURE = {
  deepseek: {
    models: {
      'deepseek-v4-flash': {
        name: 'DeepSeek V4 Flash',
        cost: { input: 0.15, output: 0.6, reasoning: 0.6, cache_read: 0.003 },
        limit: { context: 1000000, output: 384000 },
        reasoning: true,
        tool_call: true,
      },
    },
  },
  anthropic: {
    models: {
      'claude-sonnet-4-5': {
        name: 'Claude Sonnet 4.5 (latest)',
        cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
        limit: { context: 1000000, output: 64000 },
        reasoning: true,
        tool_call: true,
      },
      'claude-sonnet-4-5-20250929': {
        name: 'Claude Sonnet 4.5',
        cost: { input: 3, output: 15, cache_read: 0.3, cache_write: 3.75 },
        limit: { context: 1000000, output: 64000 },
      },
    },
  },
  google: {
    models: {
      'gemini-2.5-pro': {
        name: 'Gemini 2.5 Pro',
        cost: { input: 1.25, output: 10, cache_read: 0.125 },
        limit: { context: 1048576, output: 65536 },
      },
    },
  },
  zhipuai: {
    models: {
      'glm-4.7': {
        name: 'GLM-4.7',
        cost: { input: 0.6, output: 2.2, cache_read: 0.11, cache_write: 0 },
        limit: { context: 204800, output: 131072 },
      },
    },
  },
  opencode: {
    models: {
      'glm-4.7': {
        name: 'GLM-4.7',
        cost: { input: 0.6, output: 2.2, cache_read: 0.1 },
        limit: { context: 204800, output: 131072 },
      },
      'nemotron-3-ultra-free': {
        name: 'Nemotron 3 Ultra Free',
        cost: { input: 0, output: 0, cache_read: 0 },
        limit: { context: 1000000, output: 128000 },
      },
    },
  },
  ollama: {
    models: {
      llama3: { name: 'Llama 3', limit: { context: 8192 } },
    },
  },
};

const jsonResponse = (body: unknown, status = 200) =>
  ({
    ok: status < 400,
    status,
    json: async () => body,
  }) as unknown as Response;

describe('ModelsDevService（价目参考源）', () => {
  let service: ModelsDevService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new ModelsDevService();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const seed = async (body: unknown = FIXTURE) => {
    fetchMock.mockResolvedValue(jsonResponse(body));
    await service.refresh();
  };

  it('refresh 成功：状态 available、规模计数、来源地址', async () => {
    await seed();
    const status = service.getStatus();
    expect(status.available).toBe(true);
    expect(status.stale).toBe(false);
    expect(status.providerCount).toBe(6);
    expect(status.modelCount).toBe(8);
    expect(status.source).toBe('https://models.dev/api.json');
    expect(status.error).toBeNull();
    expect(() => new Date(status.fetchedAt as string)).not.toThrow();
  });

  it('首次状态：从未拉取则 available=false、stale=true、计数为 0', () => {
    const status = service.getStatus();
    expect(status.available).toBe(false);
    expect(status.stale).toBe(true);
    expect(status.providerCount).toBe(0);
    expect(status.modelCount).toBe(0);
    expect(status.fetchedAt).toBeNull();
  });

  it('厂家别名解析：glm→zhipuai、gemini→google、deepseek 直查', async () => {
    await seed();
    expect(service.resolveItemizedPrice('glm', 'glm-4.7')).toEqual({
      inputPerM: 0.6,
      outputPerM: 2.2,
    });
    expect(service.resolveItemizedPrice('gemini', 'gemini-2.5-pro')).toEqual({
      inputPerM: 1.25,
      outputPerM: 10,
    });
    expect(
      service.resolveItemizedPrice('deepseek', 'deepseek-v4-flash'),
    ).toEqual({ inputPerM: 0.15, outputPerM: 0.6 });
  });

  it('日期尾缀模糊命中：查询 id 包含目录 id 方向取价', async () => {
    await seed();
    expect(
      service.resolveItemizedPrice('anthropic', 'claude-sonnet-4-5-20250929'),
    ).toEqual({ inputPerM: 3, outputPerM: 15 });
  });

  it('未命中返回 null：跨厂家不串价、未知厂家不猜', async () => {
    await seed();
    expect(service.resolveItemizedPrice('deepseek', 'glm-4.7')).toBeNull();
    expect(service.resolveItemizedPrice('moonshot', 'kimi-k2.6')).toBeNull();
    expect(
      service.resolveItemizedPrice('deepseek', 'totally-unknown-model'),
    ).toBeNull();
  });

  it('免费模型 0 价目照实返回（非 null）；无 cost 条目不造假', async () => {
    await seed();
    expect(
      service.resolveItemizedPrice('opencode', 'nemotron-3-ultra-free'),
    ).toEqual({ inputPerM: 0, outputPerM: 0 });
    expect(service.resolveItemizedPrice('ollama', 'llama3')).toBeNull();
  });

  it('refresh 失败：首次无缓存 available=false 透出 error；有旧缓存则保留旧数据', async () => {
    fetchMock.mockRejectedValue(new Error('models.dev HTTP 503'));
    const first = await service.refresh();
    expect(first.available).toBe(false);
    expect(first.error).toBe('models.dev HTTP 503');

    await seed();
    fetchMock.mockRejectedValue(new Error('network down'));
    const second = await service.refresh();
    expect(second.available).toBe(true);
    expect(second.error).toBe('network down');
    // 旧缓存仍可查价
    expect(
      service.resolveItemizedPrice('deepseek', 'deepseek-v4-flash'),
    ).toEqual({ inputPerM: 0.15, outputPerM: 0.6 });
  });

  it('缓存过期：查表仍可用并后台触发一次再拉取', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ deepseek: FIXTURE.deepseek }));
    await service.refresh();
    expect(service.getStatus().modelCount).toBe(1);

    (service as any).cache.fetchedAt = Date.now() - 25 * 60 * 60 * 1000;
    fetchMock.mockResolvedValue(
      jsonResponse({ deepseek: FIXTURE.deepseek, zhipuai: FIXTURE.zhipuai }),
    );
    expect(
      service.resolveItemizedPrice('deepseek', 'deepseek-v4-flash'),
    ).toEqual({ inputPerM: 0.15, outputPerM: 0.6 });

    await new Promise((r) => setTimeout(r, 0));
    expect(service.getStatus().modelCount).toBe(2);
  });
});
