import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../core/database/prisma.service';
import { ModelsDevService } from './models-dev.service';
import { UsagePricingService } from './usage-pricing.service';

/**
 * CAP-A-21：用量估价链单测——
 * AIModelConfig 配置价 → models.dev 分项参考价 → 内置混合表 → null。
 * models.dev 夹具取自 api.json 实测数据（2026-09-19），fetch stubGlobal 隔离。
 */

const FIXTURE = {
  deepseek: {
    models: {
      'deepseek-v4-flash': {
        name: 'DeepSeek V4 Flash',
        cost: { input: 0.15, output: 0.6 },
      },
    },
  },
  opencode: {
    models: {
      'nemotron-3-ultra-free': {
        name: 'Nemotron 3 Ultra Free',
        cost: { input: 0, output: 0 },
      },
    },
  },
};

describe('UsagePricingService（估价链）', () => {
  let service: UsagePricingService;
  let modelsDev: ModelsDevService;

  const mockPrisma = {
    aIModelConfig: { findMany: vi.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsagePricingService,
        ModelsDevService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(UsagePricingService);
    modelsDev = module.get(ModelsDevService);
    mockPrisma.aIModelConfig.findMany.mockResolvedValue([]);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => FIXTURE,
      } as unknown as Response),
    );
    await modelsDev.refresh();
    vi.clearAllMocks();
    mockPrisma.aIModelConfig.findMany.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('零 token：直接 null，不查任何来源', async () => {
    const result = await service.estimateCostUsd({
      modelName: 'deepseek-v4-flash',
      provider: 'deepseek',
      promptTokens: 0,
      completionTokens: 0,
    });
    expect(result).toBeNull();
    expect(mockPrisma.aIModelConfig.findMany).not.toHaveBeenCalled();
  });

  it('AIModelConfig 配置价最高优先（覆盖 models.dev 分项价）', async () => {
    mockPrisma.aIModelConfig.findMany.mockResolvedValue([
      {
        name: 'deepseek-v4-flash',
        provider: 'deepseek',
        costPer1kTokens: 0.005,
      },
    ]);
    const result = await service.estimateCostUsd({
      modelName: 'deepseek-v4-flash',
      provider: 'deepseek',
      promptTokens: 100,
      completionTokens: 50,
    });
    // 混合价：(150/1000)×0.005 = 0.00075（分项价会算出 0.000045）
    expect(result).toBe(0.00075);
  });

  it('models.dev 分项价：prompt×input + completion×output（USD/百万）', async () => {
    const result = await service.estimateCostUsd({
      modelName: 'deepseek-v4-flash',
      provider: 'deepseek',
      promptTokens: 1_000_000,
      completionTokens: 500_000,
    });
    // (1e6×0.15 + 5e5×0.6)/1e6 = 0.15 + 0.3
    expect(result).toBe(0.45);
  });

  it('免费模型（0 价目）估算为 0 而非 null', async () => {
    const result = await service.estimateCostUsd({
      modelName: 'nemotron-3-ultra-free',
      provider: 'opencode',
      promptTokens: 1000,
      completionTokens: 100,
    });
    expect(result).toBe(0);
  });

  it('models.dev 未命中回落内置混合表', async () => {
    const result = await service.estimateCostUsd({
      modelName: 'gpt-4o-mini',
      provider: 'vendor-x',
      promptTokens: 2000,
      completionTokens: 0,
    });
    // (2000/1000)×0.0006
    expect(result).toBe(0.0012);
  });

  it('全链未命中返回 null', async () => {
    const result = await service.estimateCostUsd({
      modelName: 'totally-unknown-model',
      provider: 'nope',
      promptTokens: 100,
      completionTokens: 100,
    });
    expect(result).toBeNull();
  });

  it('AIModelConfig 查询抛错不阻断：回落 models.dev 分项价', async () => {
    mockPrisma.aIModelConfig.findMany.mockRejectedValue(
      new Error('db unavailable'),
    );
    const result = await service.estimateCostUsd({
      modelName: 'deepseek-v4-flash',
      provider: 'deepseek',
      promptTokens: 1_000_000,
      completionTokens: 0,
    });
    expect(result).toBe(0.15);
  });
});
