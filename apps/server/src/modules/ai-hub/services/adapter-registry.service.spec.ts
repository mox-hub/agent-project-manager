import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../core/database/prisma.service';
import { EncryptionService } from '../../../core/crypto/encryption.service';
import { AiSdkAdapterFactory } from '../adapters/ai-sdk-adapter.factory';
import { AdapterRegistryService } from './adapter-registry.service';

/**
 * 同类型多供应商槽位（P2-22）下适配器注册表的代表槽位语义：
 * 每类型只装载最早启用槽位的适配器，reload/resolveAdapter 同口径解析。
 */
describe('AdapterRegistryService（代表槽位解析）', () => {
  let service: AdapterRegistryService;

  const mockAdapter = {
    getModelName: vi.fn(() => 'deepseek-chat'),
    getProvider: vi.fn(() => 'deepseek'),
    getModel: vi.fn(() => null),
  };

  const mockPrisma = {
    aIProviderConfig: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  };

  const mockFactory = {
    createFromConfig: vi.fn(() => mockAdapter),
  };

  const makeSlot = (overrides: Record<string, unknown>) => ({
    id: 'slot',
    provider: 'deepseek',
    displayName: 'DeepSeek',
    sdkType: 'openai',
    apiKeyEnc: 'enc:sk-test',
    baseUrl: null,
    organizationId: null,
    enabled: true,
    createdAt: new Date('2026-09-20T00:00:00Z'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdapterRegistryService,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: EncryptionService,
          useValue: { decrypt: vi.fn(() => 'sk-test') },
        },
        { provide: AiSdkAdapterFactory, useValue: mockFactory },
      ],
    }).compile();
    service = module.get(AdapterRegistryService);
    vi.clearAllMocks();
    mockFactory.createFromConfig.mockReturnValue(mockAdapter);
  });

  it('loadAdapters：同类型多槽位只装载最早启用槽位（代表槽位），后续跳过', async () => {
    mockPrisma.aIProviderConfig.findMany.mockResolvedValue([
      makeSlot({
        id: 'slot-first',
        displayName: 'DeepSeek 官方',
        baseUrl: 'https://api.deepseek.com/v1',
      }),
      makeSlot({
        id: 'slot-second',
        displayName: 'DeepSeek 中转',
        baseUrl: 'https://relay.example.com/v1',
        createdAt: new Date('2026-09-20T01:00:00Z'),
      }),
    ]);

    await service.loadAdapters();

    expect(mockFactory.createFromConfig).toHaveBeenCalledTimes(1);
    expect(mockFactory.createFromConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com/v1',
      }),
    );
    expect(service.getAdapter('deepseek')).toBe(mockAdapter);
  });

  it('reload(类型)：按代表槽位口径查询（enabled + createdAt asc）并重建适配器', async () => {
    const representative = makeSlot({
      id: 'slot-first',
      displayName: 'DeepSeek 官方',
      baseUrl: 'https://api.deepseek.com/v1',
    });
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(representative);

    await service.reload('deepseek');

    expect(mockPrisma.aIProviderConfig.findFirst).toHaveBeenCalledWith({
      where: { provider: 'deepseek', enabled: true },
      orderBy: { createdAt: 'asc' },
    });
    expect(mockFactory.createFromConfig).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://api.deepseek.com/v1' }),
    );
    expect(service.getAdapter('deepseek')).toBe(mockAdapter);
  });

  it('reload(类型)：无启用槽位时不装载适配器', async () => {
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(null);

    await service.reload('deepseek');

    expect(mockFactory.createFromConfig).not.toHaveBeenCalled();
    expect(service.getAdapter('deepseek')).toBeNull();
  });

  it('resolveAdapter：缓存未命中时读代表槽位惰性构建并缓存', async () => {
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(
      makeSlot({ id: 'slot-first', displayName: 'DeepSeek 官方' }),
    );

    const adapter = await service.resolveAdapter(
      'deepseek',
      'deepseek-reasoner',
    );

    expect(adapter).toBe(mockAdapter);
    expect(mockFactory.createFromConfig).toHaveBeenCalledWith(
      expect.objectContaining({ defaultModel: 'deepseek-reasoner' }),
    );
    // 第二次走 modelAdapters 缓存，零 DB 查询
    await service.resolveAdapter('deepseek', 'deepseek-reasoner');
    expect(mockPrisma.aIProviderConfig.findFirst).toHaveBeenCalledTimes(1);
  });
});
