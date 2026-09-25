import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../core/database/prisma.service';
import { EncryptionService } from '../../../core/crypto/encryption.service';
import { MessageBusService } from '../../../core/message-bus/message-bus.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { AiSdkAdapterFactory } from '../adapters/ai-sdk-adapter.factory';
import { ProviderConfigService } from './provider-config.service';
import { CreateProviderConfigDto } from '../dto/provider-config.dto';

/**
 * CAP-A-20：供应商模型真实查询（/models 端点 + metadata.modelsEndpoint 覆盖）
 * 与内置模型（AppConfig ai.defaultModel）存取的单测。
 * fetch 以 stubGlobal 隔离——本套件零真实网络调用。
 */
describe('ProviderConfigService（模型查询 + 内置模型）', () => {
  let service: ProviderConfigService;

  const mockPrisma = {
    aIProviderConfig: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    aIModelConfig: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    appConfig: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  };

  const mockEncryption = {
    encrypt: vi.fn((k: string) => `enc:${k}`),
    decrypt: vi.fn(() => 'sk-test'),
  };

  const mockAdapterFactory = {
    create: vi.fn(),
    createFromConfig: vi.fn(),
  };

  const deepseekProvider = {
    id: 'p-deepseek',
    provider: 'deepseek',
    displayName: 'DeepSeek',
    sdkType: 'openai',
    apiKeyEnc: 'enc:sk-test',
    baseUrl: 'https://api.deepseek.com/v1',
    organizationId: null,
    metadata: null,
    enabled: true,
    status: 'connected',
    lastValidatedAt: null,
    errorMessage: null,
  };

  const jsonResponse = (body: unknown, status = 200) =>
    ({
      ok: status < 400,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }) as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderConfigService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncryptionService, useValue: mockEncryption },
        { provide: MessageBusService, useValue: { publish: vi.fn() } },
        { provide: AdapterRegistryService, useValue: { reload: vi.fn() } },
        { provide: AiSdkAdapterFactory, useValue: mockAdapterFactory },
      ],
    }).compile();
    service = module.get(ProviderConfigService);
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('detectModels（真实查询）', () => {
    it('openai 兼容协议：GET {baseUrl}/models + Bearer，结果排序并覆盖式落库 AIModelConfig', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({
          data: [{ id: 'deepseek-reasoner' }, { id: 'deepseek-chat' }],
        }),
      );

      const result = await service.detectModels('p-deepseek');

      expect(result).toEqual({
        models: ['deepseek-chat', 'deepseek-reasoner'],
        synced: true,
      });
      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.deepseek.com/v1/models');
      expect((init as RequestInit).headers).toMatchObject({
        Authorization: 'Bearer sk-test',
      });
      // 覆盖式：先删同厂家不在结果内的旧模型，再 upsert 结果集
      expect(mockPrisma.aIModelConfig.deleteMany).toHaveBeenCalledWith({
        where: {
          provider: 'deepseek',
          name: { notIn: ['deepseek-chat', 'deepseek-reasoner'] },
        },
      });
      expect(mockPrisma.aIModelConfig.upsert).toHaveBeenCalledTimes(2);
      // 查询成功 → 在线状态同步
      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-deepseek' },
          data: expect.objectContaining({ status: 'connected' }),
        }),
      );
    });

    it('opencode-go：显式 baseUrl 走 openai 兼容 {base}/models + Bearer，覆盖式落库', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        id: 'p-oc-go',
        provider: 'opencode-go',
        displayName: 'OpenCode Go',
        baseUrl: 'https://opencode.ai/zen/go/v1',
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({
          data: [{ id: 'qwen3.7-max' }, { id: 'kimi-k2.6' }],
        }),
      );

      const result = await service.detectModels('p-oc-go');

      expect(result).toEqual({
        models: ['kimi-k2.6', 'qwen3.7-max'],
        synced: true,
      });
      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://opencode.ai/zen/go/v1/models');
      expect((init as RequestInit).headers).toMatchObject({
        Authorization: 'Bearer sk-test',
      });
      expect(mockPrisma.aIModelConfig.deleteMany).toHaveBeenCalledWith({
        where: {
          provider: 'opencode-go',
          name: { notIn: ['kimi-k2.6', 'qwen3.7-max'] },
        },
      });
    });

    it('opencode（Zen）：未配 baseUrl 时按内置默认端点派生（zen/v1）', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        id: 'p-oc',
        provider: 'opencode',
        displayName: 'OpenCode Zen',
        baseUrl: null,
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ data: [{ id: 'claude-sonnet-4-6' }] }),
      );

      const result = await service.detectModels('p-oc');

      expect(result).toEqual({ models: ['claude-sonnet-4-6'], synced: true });
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://opencode.ai/zen/v1/models',
      );
    });

    it('metadata.modelsEndpoint 显式覆盖默认端点（如 https://api.deepseek.com/models）', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        baseUrl: null,
        metadata: { modelsEndpoint: 'https://api.deepseek.com/models' },
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ data: [{ id: 'deepseek-chat' }] }),
      );

      const result = await service.detectModels('p-deepseek');

      expect(result).toEqual({ models: ['deepseek-chat'], synced: true });
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://api.deepseek.com/models',
      );
    });

    it('anthropic 协议：x-api-key + anthropic-version 头，base 不带版本段时拼 /v1/models', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        provider: 'anthropic',
        sdkType: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ data: [{ id: 'claude-sonnet-4-20250514' }] }),
      );

      const result = await service.detectModels('p-deepseek');

      expect(result).toEqual({
        models: ['claude-sonnet-4-20250514'],
        synced: true,
      });
      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.anthropic.com/v1/models');
      expect((init as RequestInit).headers).toMatchObject({
        'x-api-key': 'sk-test',
        'anthropic-version': '2023-06-01',
      });
    });

    it('gemini 协议：?key= 参数 + models/ 前缀剥离', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        provider: 'gemini',
        sdkType: 'google',
        baseUrl: 'https://generativelanguage.googleapis.com',
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ models: [{ name: 'models/gemini-2.0-flash' }] }),
      );

      const result = await service.detectModels('p-deepseek');

      expect(result).toEqual({ models: ['gemini-2.0-flash'], synced: true });
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://generativelanguage.googleapis.com/v1beta/models?key=sk-test',
      );
    });

    it('HTTP 错误透出状态码（不静默兜底）并标记 error 态', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ error: { message: 'Invalid API key' } }, 401),
      );

      await expect(service.detectModels('p-deepseek')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.detectModels('p-deepseek')).rejects.toThrow(
        /HTTP 401/,
      );
      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-deepseek' },
          data: expect.objectContaining({ status: 'error' }),
        }),
      );
    });

    it('端点不可达：BadRequest 而非裸网络错误', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('ECONNREFUSED'),
      );

      await expect(service.detectModels('p-deepseek')).rejects.toThrow(
        /unreachable/,
      );
    });

    it('查询结果为空：不执行覆盖（synced=false，零 DB 写入）', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ data: [] }),
      );

      const result = await service.detectModels('p-deepseek');

      expect(result).toEqual({ models: [], synced: false });
      expect(mockPrisma.aIModelConfig.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.aIModelConfig.upsert).not.toHaveBeenCalled();
    });
  });

  describe('validateProvider（验证有效即在线）', () => {
    it('校验通过且携带 providerConfigId → 同步该记录 status=connected', async () => {
      mockAdapterFactory.create.mockReturnValue({
        validateConnection: async () => ({ valid: true, models: ['x'] }),
      });

      const result = await service.validateProvider({
        provider: 'deepseek' as any,
        apiKey: 'sk-test',
        providerConfigId: 'p-deepseek',
      } as any);

      expect(result.valid).toBe(true);
      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-deepseek' },
          data: expect.objectContaining({
            status: 'connected',
            errorMessage: null,
          }),
        }),
      );
    });

    it('校验失败不落状态（被验的是新 key，不代表已保存 key 失效）', async () => {
      mockAdapterFactory.create.mockReturnValue({
        validateConnection: async () => ({ valid: false, error: 'bad key' }),
      });

      const result = await service.validateProvider({
        provider: 'deepseek' as any,
        apiKey: 'sk-test',
        providerConfigId: 'p-deepseek',
      } as any);

      expect(result.valid).toBe(false);
      expect(mockPrisma.aIProviderConfig.update).not.toHaveBeenCalled();
    });
  });

  describe('getProviderBalance（余额查询归一化）', () => {
    it('DeepSeek 充值型：baseUrl 域名根派生 /user/balance + Bearer，解析 prepaid', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({
          is_available: true,
          balance_infos: [
            {
              currency: 'CNY',
              total_balance: '110.55',
              granted_balance: '10.00',
              topped_up_balance: '100.55',
            },
          ],
        }),
      );

      const balance = await service.getProviderBalance('p-deepseek');

      expect(balance).toEqual({
        type: 'prepaid',
        currency: 'CNY',
        balance: 110.55,
        grantedBalance: 10,
        toppedUpBalance: 100.55,
        isAvailable: true,
        windows: [],
      });
      const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toBe('https://api.deepseek.com/user/balance');
      expect((init as RequestInit).headers).toMatchObject({
        Authorization: 'Bearer sk-test',
      });
      // 查询成功 → 在线
      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-deepseek' },
          data: expect.objectContaining({ status: 'connected' }),
        }),
      );
    });

    it('metadata.balanceEndpoint 显式覆盖默认端点', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        metadata: { balanceEndpoint: 'https://custom.example.com/balance' },
      });
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({
          balance_infos: [{ currency: 'USD', total_balance: '5.2' }],
        }),
      );

      const balance = await service.getProviderBalance('p-deepseek');

      expect(balance.type).toBe('prepaid');
      expect(balance.balance).toBe(5.2);
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://custom.example.com/balance',
      );
    });

    it('编程套餐型：usage 嵌套周期键归一化为 5h/week/month 窗口并稳定排序', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({
          usage: {
            monthly: { used_tokens: '900', limit_tokens: '4000' },
            five_hour: { used_tokens: '120', limit_tokens: '500' },
            weekly: { used_tokens: '300', limit_tokens: '2000' },
          },
        }),
      );

      const balance = await service.getProviderBalance('p-deepseek');

      expect(balance.type).toBe('subscription');
      expect(balance.windows.map((w) => w.period)).toEqual([
        '5h',
        'week',
        'month',
      ]);
      expect(balance.windows[0]).toEqual({
        period: '5h',
        used: 120,
        limit: 500,
        remaining: null,
        percent: null,
        resetsAt: null,
      });
    });

    it('OpenCode Go 套餐：/usage 端点 + rolling 别名归一 5h + percent-only 窗口（percent=0 不丢）', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        provider: 'opencode-go',
        baseUrl: 'https://opencode.ai/zen/go/v1',
      });
      // 实机响应夹具（2026-09-19 采样）：仅 percent + resetsAt，无 used/limit 绝对值
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({
          usage: {
            rolling: {
              status: 'ok',
              percent: 0,
              resetsAt: '2026-09-19T16:29:20.195Z',
            },
            weekly: {
              status: 'ok',
              percent: 20,
              resetsAt: '2026-09-21T00:00:00.195Z',
            },
            monthly: {
              status: 'ok',
              percent: 2,
              resetsAt: '2026-10-15T15:22:49.195Z',
            },
          },
        }),
      );

      const balance = await service.getProviderBalance('p-deepseek');

      // 端点：baseUrl 版本段下拼 /usage（非域名根 /user/balance）
      expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe(
        'https://opencode.ai/zen/go/v1/usage',
      );
      expect(balance.type).toBe('subscription');
      expect(balance.windows.map((w) => w.period)).toEqual([
        '5h',
        'week',
        'month',
      ]);
      expect(balance.windows).toEqual([
        {
          period: '5h',
          used: null,
          limit: null,
          remaining: null,
          percent: 0,
          resetsAt: '2026-09-19T16:29:20.195Z',
        },
        {
          period: 'week',
          used: null,
          limit: null,
          remaining: null,
          percent: 20,
          resetsAt: '2026-09-21T00:00:00.195Z',
        },
        {
          period: 'month',
          used: null,
          limit: null,
          remaining: null,
          percent: 2,
          resetsAt: '2026-10-15T15:22:49.195Z',
        },
      ]);
    });

    it('windows 数组直出形态（自带 period 字段）同样识别', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({
          windows: [
            { period: 'week', used: 3.5, limit: 10, resets_at: '2026-09-20' },
          ],
        }),
      );

      const balance = await service.getProviderBalance('p-deepseek');

      expect(balance.type).toBe('subscription');
      expect(balance.windows).toEqual([
        {
          period: 'week',
          used: 3.5,
          limit: 10,
          remaining: null,
          percent: null,
          resetsAt: '2026-09-20',
        },
      ]);
    });

    it('无法识别的返回形状 → type=unknown（空窗口）', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ code: 0, message: 'ok' }),
      );

      const balance = await service.getProviderBalance('p-deepseek');

      expect(balance).toEqual({
        type: 'unknown',
        currency: null,
        balance: null,
        isAvailable: null,
        windows: [],
      });
    });

    it('HTTP 错误透出并标记 error 态', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );
      (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        jsonResponse({ error: { message: 'Authentication Fails' } }, 401),
      );

      await expect(service.getProviderBalance('p-deepseek')).rejects.toThrow(
        /HTTP 401/,
      );
      expect(mockPrisma.aIProviderConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-deepseek' },
          data: expect.objectContaining({ status: 'error' }),
        }),
      );
    });

    it('未配置 API key → BadRequest', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue({
        ...deepseekProvider,
        apiKeyEnc: null,
      });

      await expect(service.getProviderBalance('p-deepseek')).rejects.toThrow(
        /no API key/,
      );
    });
  });

  describe('listProviders（availableModels 附带）', () => {
    it('按厂家归并 AIModelConfig 已启用模型', async () => {
      mockPrisma.aIProviderConfig.findMany.mockResolvedValue([
        deepseekProvider,
      ]);
      mockPrisma.aIModelConfig.findMany.mockResolvedValue([
        { provider: 'deepseek', name: 'deepseek-chat' },
        { provider: 'deepseek', name: 'deepseek-reasoner' },
        { provider: 'openai', name: 'gpt-4o' },
      ]);

      const providers = await service.listProviders();

      expect(providers).toHaveLength(1);
      expect(providers[0].availableModels).toEqual([
        'deepseek-chat',
        'deepseek-reasoner',
      ]);
    });
  });

  describe('getDefaultModel / setDefaultModel', () => {
    it('未设置返回 null；畸形值同样返回 null', async () => {
      mockPrisma.appConfig.findFirst.mockResolvedValueOnce(null);
      await expect(service.getDefaultModel()).resolves.toBeNull();

      mockPrisma.appConfig.findFirst.mockResolvedValueOnce({
        key: 'ai.defaultModel',
        value: { provider: '', model: 42 },
      });
      await expect(service.getDefaultModel()).resolves.toBeNull();
    });

    it('设置：未知 provider 404 / 禁用 provider 400', async () => {
      // 代表槽位解析：无启用槽位（findFirst enabled→null）且无任何槽位 → 404
      mockPrisma.aIProviderConfig.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      await expect(
        service.setDefaultModel('deepseek', 'deepseek-chat'),
      ).rejects.toThrow(NotFoundException);

      // 无启用槽位但存在禁用槽位 → 400 disabled
      mockPrisma.aIProviderConfig.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          ...deepseekProvider,
          enabled: false,
        });
      await expect(
        service.setDefaultModel('deepseek', 'deepseek-chat'),
      ).rejects.toThrow(/disabled/);
    });

    it('设置成功：已有配置走 update、首次走 create，值形如 { provider, model }', async () => {
      mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(deepseekProvider);

      mockPrisma.appConfig.findFirst.mockResolvedValueOnce({
        id: 'cfg-1',
        value: { provider: 'openai', model: 'gpt-4o' },
      });
      await service.setDefaultModel('deepseek', 'deepseek-chat');
      expect(mockPrisma.appConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cfg-1' },
          data: { value: { provider: 'deepseek', model: 'deepseek-chat' } },
        }),
      );

      mockPrisma.appConfig.findFirst.mockResolvedValueOnce(null);
      const saved = await service.setDefaultModel('deepseek', 'deepseek-chat');
      expect(saved).toEqual({ provider: 'deepseek', model: 'deepseek-chat' });
      expect(mockPrisma.appConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: 'ai.defaultModel',
            scope: 'global',
            value: { provider: 'deepseek', model: 'deepseek-chat' },
          }),
        }),
      );
    });

    it('读取已设置的内置模型', async () => {
      mockPrisma.appConfig.findFirst.mockResolvedValue({
        key: 'ai.defaultModel',
        value: { provider: 'deepseek', model: 'deepseek-chat' },
      });
      await expect(service.getDefaultModel()).resolves.toEqual({
        provider: 'deepseek',
        model: 'deepseek-chat',
      });
    });
  });

  describe('同类型多槽位（provider+displayName 组合唯一）', () => {
    it('同类型不同显示名可并存（双网关槽位）', async () => {
      // 组合键 (deepseek, "DeepSeek 中转") 未占用
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(null);
      mockPrisma.aIProviderConfig.create.mockResolvedValue({
        ...deepseekProvider,
        id: 'p-deepseek-relay',
        displayName: 'DeepSeek 中转',
        baseUrl: 'https://relay.example.com/v1',
      });

      const created = await service.createProvider({
        provider: 'deepseek',
        displayName: 'DeepSeek 中转',
        apiKey: 'sk-relay',
        baseUrl: 'https://relay.example.com/v1',
      } as CreateProviderConfigDto);

      expect(created.displayName).toBe('DeepSeek 中转');
      expect(mockPrisma.aIProviderConfig.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            provider: 'deepseek',
            displayName: 'DeepSeek 中转',
          }),
        }),
      );
    });

    it('同类型同显示名重复创建 → 400 可读错误（不落库）', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );

      await expect(
        service.createProvider({
          provider: 'deepseek',
          displayName: 'DeepSeek',
          apiKey: 'sk-again',
        } as CreateProviderConfigDto),
      ).rejects.toThrow(/already exists.*deepseek/s);
      expect(mockPrisma.aIProviderConfig.create).not.toHaveBeenCalled();
    });

    it('改名撞同类型另一槽位显示名 → 400；不撞 → 正常更新', async () => {
      mockPrisma.aIProviderConfig.findUnique.mockResolvedValue(
        deepseekProvider,
      );

      // 撞名：同类型存在另一槽位占用目标显示名
      mockPrisma.aIProviderConfig.findFirst.mockResolvedValueOnce({
        ...deepseekProvider,
        id: 'p-deepseek-relay',
        displayName: 'DeepSeek 中转',
      });
      await expect(
        service.updateProvider('p-deepseek', { displayName: 'DeepSeek 中转' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.aIProviderConfig.update).not.toHaveBeenCalled();

      // 不撞：正常更新
      mockPrisma.aIProviderConfig.findFirst.mockResolvedValueOnce(null);
      mockPrisma.aIProviderConfig.update.mockResolvedValue({
        ...deepseekProvider,
        displayName: 'DeepSeek 官方',
      });
      const updated = await service.updateProvider('p-deepseek', {
        displayName: 'DeepSeek 官方',
      });
      expect(updated.displayName).toBe('DeepSeek 官方');
    });
  });
});
