import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { EncryptionService } from '../../../core/crypto/encryption.service';
import { MessageBusService } from '../../../core/message-bus/message-bus.service';
import { AdapterRegistryService } from './adapter-registry.service';
import { AiSdkAdapterFactory } from '../adapters/ai-sdk-adapter.factory';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  ValidateProviderDto,
  ValidateProviderResponseDto,
  ProviderConfigResponseDto,
  ProviderBalanceResponseDto,
  ProviderBalanceWindowDto,
  AIBalanceType,
} from '../dto/provider-config.dto';

/** 内置模型（工作区默认 AI 模型）的 AppConfig 存储键（scope=global，随工作区库天然隔离） */
export const AI_DEFAULT_MODEL_CONFIG_KEY = 'ai.defaultModel';

/** 内置模型值形状 */
export interface AiDefaultModelValue {
  provider: string;
  model: string;
}

/** 模型查询结果（synced=false 表示查询结果为空、未执行覆盖） */
export interface DetectModelsResult {
  models: string[];
  synced: boolean;
}

/**
 * Provider 配置服务
 * 处理 AI Provider 的 CRUD 操作和验证
 */
@Injectable()
export class ProviderConfigService {
  private readonly logger = new Logger(ProviderConfigService.name);

  /**
   * 各厂家默认 Base URL（模型查询端点派生用，与前端 PROVIDER_DEFAULT_BASE_URL 对齐）
   */
  private static readonly PROVIDER_DEFAULT_BASE_URLS: Record<string, string> = {
    openai: 'https://api.openai.com/v1',
    anthropic: 'https://api.anthropic.com',
    gemini: 'https://generativelanguage.googleapis.com',
    deepseek: 'https://api.deepseek.com/v1',
    glm: 'https://open.bigmodel.cn/api/paas/v4',
    opencode: 'https://opencode.ai/zen/v1',
    'opencode-go': 'https://opencode.ai/zen/go/v1',
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly messageBus: MessageBusService,
    private readonly adapterRegistry: AdapterRegistryService,
    private readonly adapterFactory: AiSdkAdapterFactory,
  ) {}

  /**
   * 获取所有 Provider 配置（附 availableModels：AIModelConfig 中该厂家的已启用模型）
   */
  async listProviders(): Promise<ProviderConfigResponseDto[]> {
    const [providers, modelConfigs] = await Promise.all([
      this.prisma.aIProviderConfig.findMany({
        orderBy: { provider: 'asc' },
      }),
      this.prisma.aIModelConfig.findMany({
        where: { enabled: true },
        select: { provider: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const modelsByProvider = new Map<string, string[]>();
    for (const m of modelConfigs) {
      const list = modelsByProvider.get(m.provider) ?? [];
      list.push(m.name);
      modelsByProvider.set(m.provider, list);
    }

    return providers.map(
      (p) =>
        ({
          ...this.toResponseDto(p),
          availableModels: modelsByProvider.get(p.provider) ?? [],
        }) as ProviderConfigResponseDto,
    );
  }

  /**
   * 获取单个 Provider 配置（附 availableModels）
   */
  async getProvider(id: string): Promise<ProviderConfigResponseDto> {
    const provider = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    const modelConfigs = await this.prisma.aIModelConfig.findMany({
      where: { provider: provider.provider, enabled: true },
      select: { name: true },
      orderBy: { name: 'asc' },
    });

    return {
      ...this.toResponseDto(provider),
      availableModels: modelConfigs.map((m) => m.name),
    } as ProviderConfigResponseDto;
  }

  /**
   * 创建 Provider 配置
   */
  async createProvider(
    dto: CreateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    // 检查是否已存在
    const existing = await this.prisma.aIProviderConfig.findUnique({
      where: { provider: dto.provider },
    });

    if (existing) {
      throw new BadRequestException(`Provider ${dto.provider} already exists`);
    }

    // 加密 API Key
    const apiKeyEnc = this.encryptionService.encrypt(dto.apiKey);

    const provider = await this.prisma.aIProviderConfig.create({
      data: {
        provider: dto.provider,
        displayName: dto.displayName,
        sdkType: this.getSdkType(dto.provider),
        apiKeyEnc,
        baseUrl: dto.baseUrl,
        organizationId: dto.organizationId,
        metadata: dto.metadata as any,
        status: 'disconnected',
      },
    });

    // 重新加载适配器
    await this.adapterRegistry.reload(provider.provider);

    // 发布事件
    this.messageBus.publish('ai.provider.updated', {
      action: 'created',
      provider: provider.provider,
    });

    return this.toResponseDto(provider);
  }

  /**
   * 更新 Provider 配置
   */
  async updateProvider(
    id: string,
    dto: UpdateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    const existing = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    const updateData: any = {};

    if (dto.displayName !== undefined) {
      updateData.displayName = dto.displayName;
    }

    if (dto.apiKey !== undefined) {
      // When an empty string is passed, clear the apiKey (set to null) and reset validation state
      if (dto.apiKey === '') {
        updateData.apiKeyEnc = null;
        updateData.status = 'disconnected';
        updateData.errorMessage = null;
        updateData.lastValidatedAt = null;
      } else {
        updateData.apiKeyEnc = this.encryptionService.encrypt(dto.apiKey);
      }
    }

    if (dto.baseUrl !== undefined) {
      updateData.baseUrl = dto.baseUrl;
    }

    if (dto.organizationId !== undefined) {
      updateData.organizationId = dto.organizationId;
    }

    if (dto.enabled !== undefined) {
      updateData.enabled = dto.enabled;
    }

    if (dto.metadata !== undefined) {
      updateData.metadata = dto.metadata as any;
    }

    const updated = await this.prisma.aIProviderConfig.update({
      where: { id },
      data: updateData,
    });

    // 重新加载适配器
    await this.adapterRegistry.reload(updated.provider);

    // 发布事件
    this.messageBus.publish('ai.provider.updated', {
      action: 'updated',
      provider: updated.provider,
    });

    return this.toResponseDto(updated);
  }

  /**
   * 删除 Provider 配置
   */
  async deleteProvider(id: string): Promise<void> {
    const existing = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    await this.prisma.aIProviderConfig.delete({
      where: { id },
    });

    // 重新加载适配器
    await this.adapterRegistry.reload(existing.provider);

    // 发布事件
    this.messageBus.publish('ai.provider.updated', {
      action: 'deleted',
      provider: existing.provider,
    });
  }

  /**
   * 校验 Provider（不落库；携带 providerConfigId 且校验通过时同步该记录在线状态）
   */
  async validateProvider(
    dto: ValidateProviderDto,
  ): Promise<ValidateProviderResponseDto> {
    const sdkType = this.getSdkTypeFromEnum(dto.provider);
    const defaultModel = this.getProviderFallbackModel(dto.provider);

    try {
      // 创建临时适配器
      const adapter = this.adapterFactory.create({
        provider: dto.provider,
        sdkType,
        apiKey: dto.apiKey,
        baseUrl: dto.baseUrl,
        organizationId: dto.organizationId,
        defaultModel,
      });

      // 校验连接
      const result = await adapter.validateConnection();

      // apiKey 验证有效即视为在线（用户明确口径：验证通过 ⇒ connected）
      if (result.valid && dto.providerConfigId) {
        await this.markProviderStatus(dto.providerConfigId, 'connected');
      }

      return {
        valid: result.valid,
        models: result.models,
        error: result.error,
      };
    } catch (error) {
      // 校验失败不落状态：被验的是输入框里的新 key，不代表已保存 key 失效
      return {
        valid: false,
        error: error.message || 'Validation failed',
      };
    }
  }

  /**
   * 检测 Provider 的可用模型（真实查询供应商 /models 端点）。
   * 覆盖式同步：一切以查询结果为准——先删除该厂家不在结果内的旧模型再 upsert；
   * 查询结果为空时不执行覆盖（synced=false），避免误清空既有清单。
   */
  async detectModels(id: string): Promise<DetectModelsResult> {
    const provider = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    if (!provider.apiKeyEnc) {
      throw new BadRequestException('Provider has no API key configured');
    }

    const apiKey = this.encryptionService.decrypt(provider.apiKeyEnc);
    let models: string[];
    try {
      models = await this.fetchModelList({
        provider: provider.provider,
        sdkType: provider.sdkType,
        apiKey,
        baseUrl: provider.baseUrl,
        metadata: provider.metadata,
      });
    } catch (error) {
      // 查询失败（认证/网络）记录为 error 态，前端徽章不再显示过期 connected
      await this.markProviderStatus(
        id,
        'error',
        error instanceof BadRequestException ? error.message : String(error),
      );
      throw error;
    }

    if (models.length === 0) {
      return { models: [], synced: false };
    }

    // 覆盖式同步：结果之外的同厂家旧模型全部删除
    await this.prisma.aIModelConfig.deleteMany({
      where: {
        provider: provider.provider,
        name: { notIn: models },
      },
    });
    for (const modelName of models) {
      await this.prisma.aIModelConfig.upsert({
        where: {
          idx_ai_model_configs_name_provider: {
            name: modelName,
            provider: provider.provider,
          },
        },
        create: {
          name: modelName,
          provider: provider.provider,
          enabled: true,
        },
        update: {},
      });
    }

    // 查询成功即视为在线
    await this.markProviderStatus(id, 'connected');

    return { models, synced: true };
  }

  /**
   * 解析模型查询端点：metadata.modelsEndpoint 显式配置优先，
   * 否则按 SDK 协议从 baseUrl（缺省回退厂家默认）派生
   */
  private resolveModelsEndpoint(provider: {
    provider: string;
    sdkType: string;
    baseUrl?: string | null;
    metadata?: unknown;
  }): string {
    const meta = (provider.metadata ?? {}) as Record<string, unknown>;
    const configured =
      typeof meta.modelsEndpoint === 'string' ? meta.modelsEndpoint.trim() : '';
    if (configured) return configured;

    const base =
      provider.baseUrl?.replace(/\/+$/, '') ||
      ProviderConfigService.PROVIDER_DEFAULT_BASE_URLS[provider.provider] ||
      '';
    if (!base) {
      throw new BadRequestException(
        `Provider ${provider.provider} has no baseUrl and no models endpoint configured`,
      );
    }

    switch (provider.sdkType) {
      case 'anthropic':
        // anthropic 默认 base 不带版本段；用户显式带 /vN 时直接拼 /models
        return /\/v\d+$/.test(base) ? `${base}/models` : `${base}/v1/models`;
      case 'google':
        return /\/v\d\w*$/.test(base)
          ? `${base}/models`
          : `${base}/v1beta/models`;
      default:
        // openai 兼容协议（openai/deepseek/glm 及任意兼容厂家）
        return `${base}/models`;
    }
  }

  /**
   * 查询供应商模型清单（OpenAI 兼容 Bearer / Anthropic x-api-key / Gemini key= 三协议）
   */
  private async fetchModelList(provider: {
    provider: string;
    sdkType: string;
    apiKey: string;
    baseUrl?: string | null;
    metadata?: unknown;
  }): Promise<string[]> {
    const endpoint = this.resolveModelsEndpoint(provider);
    const headers: Record<string, string> = { Accept: 'application/json' };
    let url = endpoint;

    switch (provider.sdkType) {
      case 'anthropic':
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'google':
        url = endpoint.includes('?')
          ? `${endpoint}&key=${encodeURIComponent(provider.apiKey)}`
          : `${endpoint}?key=${encodeURIComponent(provider.apiKey)}`;
        break;
      default:
        headers.Authorization = `Bearer ${provider.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new BadRequestException(
        `Model list query failed (endpoint unreachable): ${(error as Error).message}`,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new BadRequestException(
        `Model list query failed: HTTP ${response.status} ${body.slice(0, 300)}`,
      );
    }

    const json: unknown = await response.json().catch(() => null);
    // 空清单交由 detectModels 决定是否覆盖（不在此抛错）
    return this.parseModelList(json);
  }

  /**
   * 解析 /models 响应：openai/anthropic 为 { data: [{ id }] }，gemini 为 { models: [{ name: "models/x" }] }
   */
  private parseModelList(json: unknown): string[] {
    if (!json || typeof json !== 'object') return [];
    const obj = json as Record<string, unknown>;
    const models = new Set<string>();

    if (Array.isArray(obj.data)) {
      for (const item of obj.data) {
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as Record<string, unknown>).id === 'string'
        ) {
          models.add((item as Record<string, unknown>).id as string);
        }
      }
    } else if (Array.isArray(obj.models)) {
      for (const item of obj.models) {
        if (item && typeof item === 'object') {
          const name = (item as Record<string, unknown>).name;
          if (typeof name === 'string')
            models.add(name.replace(/^models\//, ''));
        }
      }
    }

    return [...models].sort();
  }

  /**
   * 查询 Provider 余额（代理访问厂家余额端点并归一化解析）。
   * 充值型（如 DeepSeek /user/balance）→ { type:'prepaid', balance }；
   * 编程套餐型（返回 5h/周/月等限额窗口）→ { type:'subscription', windows[] }；
   * 无法识别的返回形状 → { type:'unknown' }，可经 metadata.balanceEndpoint 自定义。
   */
  async getProviderBalance(id: string): Promise<ProviderBalanceResponseDto> {
    const provider = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    if (!provider.apiKeyEnc) {
      throw new BadRequestException('Provider has no API key configured');
    }

    const apiKey = this.encryptionService.decrypt(provider.apiKeyEnc);
    let balance: ProviderBalanceResponseDto;
    try {
      balance = await this.fetchBalance({
        provider: provider.provider,
        sdkType: provider.sdkType,
        apiKey,
        baseUrl: provider.baseUrl,
        metadata: provider.metadata,
      });
    } catch (error) {
      await this.markProviderStatus(
        id,
        'error',
        error instanceof BadRequestException ? error.message : String(error),
      );
      throw error;
    }

    // 查询成功即视为在线
    await this.markProviderStatus(id, 'connected');
    return balance;
  }

  /**
   * 解析余额端点：metadata.balanceEndpoint 显式配置优先，
   * 否则取 baseUrl（缺省回退厂家默认）的域名根 + /user/balance
   * （余额端点通常不在 API 版本段下，如 https://api.deepseek.com/user/balance）
   */
  private resolveBalanceEndpoint(provider: {
    provider: string;
    baseUrl?: string | null;
    metadata?: unknown;
  }): string {
    const meta = (provider.metadata ?? {}) as Record<string, unknown>;
    const configured =
      typeof meta.balanceEndpoint === 'string'
        ? meta.balanceEndpoint.trim()
        : '';
    if (configured) return configured;

    const base =
      provider.baseUrl?.replace(/\/+$/, '') ||
      ProviderConfigService.PROVIDER_DEFAULT_BASE_URLS[provider.provider] ||
      '';
    if (!base) {
      throw new BadRequestException(
        `Provider ${provider.provider} has no baseUrl and no balance endpoint configured`,
      );
    }
    try {
      return `${new URL(base).origin}/user/balance`;
    } catch {
      throw new BadRequestException(
        `Invalid baseUrl for balance query: ${base}`,
      );
    }
  }

  /**
   * 请求厂家余额端点（认证协议与模型查询一致）并归一化解析
   */
  private async fetchBalance(provider: {
    provider: string;
    sdkType: string;
    apiKey: string;
    baseUrl?: string | null;
    metadata?: unknown;
  }): Promise<ProviderBalanceResponseDto> {
    const endpoint = this.resolveBalanceEndpoint(provider);
    const headers: Record<string, string> = { Accept: 'application/json' };
    let url = endpoint;

    switch (provider.sdkType) {
      case 'anthropic':
        headers['x-api-key'] = provider.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        break;
      case 'google':
        url = endpoint.includes('?')
          ? `${endpoint}&key=${encodeURIComponent(provider.apiKey)}`
          : `${endpoint}?key=${encodeURIComponent(provider.apiKey)}`;
        break;
      default:
        headers.Authorization = `Bearer ${provider.apiKey}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      throw new BadRequestException(
        `Balance query failed (endpoint unreachable): ${(error as Error).message}`,
      );
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new BadRequestException(
        `Balance query failed: HTTP ${response.status} ${body.slice(0, 300)}`,
      );
    }

    const json: unknown = await response.json().catch(() => null);
    return this.parseBalance(json);
  }

  /**
   * 归一化余额响应：
   * - DeepSeek 充值型 { is_available, balance_infos: [{ currency, total_balance }] }
   * - 套餐型：任一层出现 5h/周/月等限额窗口（used/limit 对）即视为 subscription
   * - 其余 → unknown（前端提示可配置自定义查询链接）
   */
  private parseBalance(json: unknown): ProviderBalanceResponseDto {
    const unknown: ProviderBalanceResponseDto = {
      type: AIBalanceType.UNKNOWN,
      currency: null,
      balance: null,
      isAvailable: null,
      windows: [],
    };
    if (!json || typeof json !== 'object') return unknown;
    const obj = json as Record<string, unknown>;

    if (Array.isArray(obj.balance_infos)) {
      const info = obj.balance_infos.find(
        (i): i is Record<string, unknown> =>
          !!i && typeof i === 'object' && 'total_balance' in i,
      );
      const balance = this.toNullableNumber(info?.total_balance);
      if (info && balance !== null) {
        return {
          type: AIBalanceType.PREPAID,
          currency: typeof info.currency === 'string' ? info.currency : null,
          balance,
          grantedBalance: this.toNullableNumber(info.granted_balance),
          toppedUpBalance: this.toNullableNumber(info.topped_up_balance),
          isAvailable:
            typeof obj.is_available === 'boolean' ? obj.is_available : null,
          windows: [],
        };
      }
    }

    const windows = this.extractBalanceWindows(obj);
    if (windows.length > 0) {
      return {
        type: AIBalanceType.SUBSCRIPTION,
        currency: null,
        balance: null,
        isAvailable: null,
        windows,
      };
    }
    return unknown;
  }

  /** 从响应中提取限额窗口：顶层数组容器（windows/limits…）+ 周期键（5h/week/month…），最多下钻一层 */
  private extractBalanceWindows(
    obj: Record<string, unknown>,
  ): ProviderBalanceWindowDto[] {
    const windows = new Map<string, ProviderBalanceWindowDto>();

    const push = (w: ProviderBalanceWindowDto | null) => {
      if (w && !windows.has(w.period)) windows.set(w.period, w);
    };
    const fromArray = (period: string, arr: unknown[]) => {
      for (const item of arr) {
        const o = (item ?? {}) as Record<string, unknown>;
        const label = this.normalizeBalancePeriod(
          typeof o.period === 'string' ? o.period : period,
        );
        if (!label) continue;
        push(this.toBalanceWindow(label, o));
      }
    };

    for (const [key, value] of Object.entries(obj)) {
      const label = this.normalizeBalancePeriod(key);
      if (/^(windows|usage_windows|rate_limits|limits|quotas)$/i.test(key)) {
        if (Array.isArray(value)) fromArray('', value);
        else if (value && typeof value === 'object')
          fromArray('', Object.values(value as Record<string, unknown>));
        continue;
      }
      if (label && Array.isArray(value)) {
        fromArray(label, value);
      } else if (label && value && typeof value === 'object') {
        push(this.toBalanceWindow(label, value as Record<string, unknown>));
      } else if (
        /^(usage|plan|quota|subscription)$/i.test(key) &&
        value &&
        typeof value === 'object' &&
        !Array.isArray(value)
      ) {
        // 下钻一层：{ usage: { '5h': {...}, week: {...} } } 形态
        for (const [k2, v2] of Object.entries(
          value as Record<string, unknown>,
        )) {
          const label2 = this.normalizeBalancePeriod(k2);
          if (!label2) continue;
          if (Array.isArray(v2)) fromArray(label2, v2);
          else if (v2 && typeof v2 === 'object')
            push(this.toBalanceWindow(label2, v2 as Record<string, unknown>));
        }
      }
    }

    // 稳定排序：5h → day → week → month → 其他
    const order = ['5h', 'day', 'week', 'month'];
    return [...windows.values()].sort(
      (a, b) =>
        (order.indexOf(a.period) + 1 || order.length + 1) -
        (order.indexOf(b.period) + 1 || order.length + 1),
    );
  }

  /** 周期别名归一化：5h/five_hour/5-hour→5h，weekly→week，monthly→month…；非周期键返回 null */
  private normalizeBalancePeriod(raw: string): string | null {
    const s = raw.trim().toLowerCase();
    if (/^(5h|5[-_.]?hour|five[-_]?hour)$/.test(s)) return '5h';
    if (/^(day|daily)$/.test(s)) return 'day';
    if (/^(week|weekly)$/.test(s)) return 'week';
    if (/^(month|monthly)$/.test(s)) return 'month';
    return null;
  }

  private toBalanceWindow(
    period: string,
    o: Record<string, unknown>,
  ): ProviderBalanceWindowDto | null {
    const pickNum = (keys: string[]) => {
      for (const k of keys) {
        if (k in o) {
          const n = this.toNullableNumber(o[k]);
          if (n !== null) return n;
        }
      }
      return null;
    };
    const used = pickNum([
      'used',
      'usage',
      'used_tokens',
      'spent',
      'used_amount',
    ]);
    const limit = pickNum([
      'limit',
      'total',
      'limit_tokens',
      'quota',
      'cap',
      'total_amount',
      'limit_amount',
    ]);
    const remaining = pickNum([
      'remaining',
      'left',
      'available',
      'remaining_tokens',
    ]);
    if (used === null && limit === null && remaining === null) return null;
    const resets = [
      o.resets_at,
      o.reset_at,
      o.resetsAt,
      o.reset,
      o.window_ends_at,
      o.reset_time,
    ].find((v) => typeof v === 'string' && v) as string | undefined;
    return { period, used, limit, remaining, resetsAt: resets ?? null };
  }

  private toNullableNumber(v: unknown): number | null {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v === 'string') {
      const n = Number.parseFloat(v);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /**
   * 读取工作区内置模型配置（未设置返回 null）
   */
  async getDefaultModel(): Promise<AiDefaultModelValue | null> {
    const row = await this.prisma.appConfig.findFirst({
      where: { key: AI_DEFAULT_MODEL_CONFIG_KEY, scope: 'global' },
    });
    const value = row?.value as Partial<AiDefaultModelValue> | null;
    if (
      value &&
      typeof value.provider === 'string' &&
      typeof value.model === 'string' &&
      value.provider &&
      value.model
    ) {
      return { provider: value.provider, model: value.model };
    }
    return null;
  }

  /**
   * 设置工作区内置模型（校验 provider 存在且启用；模型名不做白名单校验，允许自填新模型）
   */
  async setDefaultModel(
    provider: string,
    model: string,
  ): Promise<AiDefaultModelValue> {
    const row = await this.prisma.aIProviderConfig.findUnique({
      where: { provider },
    });
    if (!row) {
      throw new NotFoundException(`Provider not found: ${provider}`);
    }
    if (!row.enabled) {
      throw new BadRequestException(`Provider ${provider} is disabled`);
    }

    const value: AiDefaultModelValue = { provider, model };
    const existing = await this.prisma.appConfig.findFirst({
      where: { key: AI_DEFAULT_MODEL_CONFIG_KEY, scope: 'global' },
    });
    if (existing) {
      await this.prisma.appConfig.update({
        where: { id: existing.id },
        data: { value: value as any },
      });
    } else {
      await this.prisma.appConfig.create({
        data: {
          key: AI_DEFAULT_MODEL_CONFIG_KEY,
          value: value as any,
          scope: 'global',
          description:
            'AI 内置模型（provider+model；无显式偏好时 getAdapter 的回落目标）',
        },
      });
    }
    return value;
  }

  /**
   * 测试已保存的 Provider 连接（解密保存的 API key）
   */
  async testSavedProvider(id: string): Promise<ValidateProviderResponseDto> {
    const provider = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    if (!provider.apiKeyEnc) {
      throw new BadRequestException('Provider has no API key configured');
    }

    let valid = false;
    let errorMessage: string | undefined;
    try {
      const apiKey = this.encryptionService.decrypt(provider.apiKeyEnc);
      const sdkType = this.getSdkTypeFromEnum(provider.provider as any);
      const defaultModel = this.getProviderFallbackModel(
        provider.provider as any,
      );

      const adapter = this.adapterFactory.create({
        provider: provider.provider,
        sdkType,
        apiKey,
        baseUrl: provider.baseUrl || undefined,
        organizationId: provider.organizationId || undefined,
        defaultModel,
      });
      const result = await adapter.validateConnection();
      valid = result.valid;
      errorMessage = result.error;
    } catch (error: any) {
      valid = false;
      errorMessage = error?.message || 'Test failed';
    }

    // 持久化测试结果到 status 字段
    await this.prisma.aIProviderConfig.update({
      where: { id },
      data: {
        status: valid ? 'connected' : 'error',
        errorMessage: errorMessage || null,
        lastValidatedAt: new Date(),
      },
    });

    return valid
      ? { valid: true, models: [] }
      : { valid: false, error: errorMessage };
  }

  /**
   * 同步 Provider 在线状态（验证/查询成功 → connected；失败 → error）。
   * 记录被并发删除等异常不阻断主流程。
   */
  private async markProviderStatus(
    id: string,
    status: 'connected' | 'error',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.prisma.aIProviderConfig.update({
        where: { id },
        data: {
          status,
          errorMessage: errorMessage ?? null,
          lastValidatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to mark provider ${id} as ${status}: ${(error as Error).message}`,
      );
    }
  }

  /**
   * 转换为响应 DTO（隐藏敏感信息）
   */
  private toResponseDto(provider: any): ProviderConfigResponseDto {
    return {
      id: provider.id,
      provider: provider.provider,
      displayName:
        provider.displayName || this.getProviderDisplayName(provider.provider),
      sdkType: provider.sdkType,
      baseUrl: provider.baseUrl,
      organizationId: provider.organizationId,
      hasApiKey: !!provider.apiKeyEnc,
      enabled: provider.enabled,
      status: provider.status,
      lastValidatedAt: provider.lastValidatedAt,
      errorMessage: provider.errorMessage,
      metadata: provider.metadata,
    };
  }

  /**
   * 获取 Provider 显示名称
   */
  private getProviderDisplayName(provider: string): string {
    const names: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      gemini: 'Google Gemini',
      deepseek: 'DeepSeek',
      glm: 'GLM (Zhipu)',
      opencode: 'OpenCode Zen',
      'opencode-go': 'OpenCode Go',
    };
    return names[provider] || provider;
  }

  /**
   * 从 provider 字符串获取 SDK 类型
   */
  private getSdkType(provider: string): string {
    const sdkTypes: Record<string, string> = {
      openai: 'openai',
      anthropic: 'anthropic',
      gemini: 'google',
      deepseek: 'openai',
      glm: 'openai',
      opencode: 'openai',
      'opencode-go': 'openai',
    };
    return sdkTypes[provider] || 'openai';
  }

  /**
   * 从枚举获取 SDK 类型
   */
  private getSdkTypeFromEnum(provider: any): 'openai' | 'anthropic' | 'google' {
    const sdkType = this.getSdkType(provider);
    return sdkType as 'openai' | 'anthropic' | 'google';
  }

  /**
   * 获取 Provider 的兜底模型（厂家硬编码表；内置模型未设置时的最终回退）
   */
  private getProviderFallbackModel(provider: string): string {
    const defaults: Record<string, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-sonnet-4-20250514',
      gemini: 'gemini-1.5-flash',
      deepseek: 'deepseek-chat',
      glm: 'glm-4',
      opencode: 'claude-sonnet-4-6',
      'opencode-go': 'qwen3.7-max',
    };
    return defaults[provider] || 'gpt-4o';
  }
}
