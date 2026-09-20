import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { EncryptionService } from '../../../core/crypto/encryption.service';
import { AiSdkAdapterFactory } from '../adapters/ai-sdk-adapter.factory';
import { ModelAdapter } from '../adapters/model-adapter.interface';

/**
 * 适配器注册表服务
 * 替代 AiHubService 中硬编码的 adapters Map
 * 从 DB 动态加载 provider 配置并管理适配器实例
 */
@Injectable()
export class AdapterRegistryService implements OnModuleInit {
  private readonly logger = new Logger(AdapterRegistryService.name);

  // 适配器注册表
  private readonly adapters = new Map<string, ModelAdapter>();

  // provider::model 专属适配器缓存（内置模型/显式模型选择时按需构建）
  private readonly modelAdapters = new Map<string, ModelAdapter>();

  // provider -> 模型列表映射
  private readonly providerDefaultModels = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly adapterFactory: AiSdkAdapterFactory,
  ) {}

  /**
   * 模块初始化时从 DB 加载所有已启用的 provider
   */
  async onModuleInit() {
    await this.loadAdapters();
  }

  /**
   * 加载所有已启用的 provider 适配器
   */
  async loadAdapters(): Promise<void> {
    this.adapters.clear();
    this.modelAdapters.clear();
    this.providerDefaultModels.clear();

    const providers = await this.prisma.aIProviderConfig.findMany({
      where: { enabled: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const provider of providers) {
      if (!provider.apiKeyEnc) {
        this.logger.log(
          `Provider ${provider.provider} has no API key, skipping`,
        );
        continue;
      }

      // 同类型多槽位：每类型只注册代表槽位（最早一条），后续槽位跳过
      if (this.adapters.has(provider.provider)) {
        this.logger.log(
          `Provider ${provider.provider} already has a representative adapter, skipping slot ${provider.id}`,
        );
        continue;
      }

      try {
        // 解密 API Key
        const apiKey = this.encryptionService.decrypt(provider.apiKeyEnc);

        // 创建适配器
        const adapter = this.adapterFactory.createFromConfig({
          provider: provider.provider,
          sdkType: provider.sdkType,
          apiKey,
          baseUrl: provider.baseUrl,
          organizationId: provider.organizationId,
        });

        // 注册适配器
        const key = `${provider.provider}`;
        this.adapters.set(key, adapter);

        // 记录默认模型
        const defaultModel = this.getDefaultModel(provider.provider);
        this.providerDefaultModels.set(provider.provider, defaultModel);

        this.logger.log(`Loaded adapter for provider: ${provider.provider}`);
      } catch (error) {
        this.logger.error(
          `Failed to load adapter for provider ${provider.provider}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Loaded ${this.adapters.size} AI provider adapters`);
  }

  /**
   * 重新加载指定 provider 或所有 provider
   */
  async reload(provider?: string): Promise<void> {
    if (provider) {
      // 重新加载单个 provider（该厂家的 model 专属缓存一并失效）
      const existing = this.adapters.get(provider);
      if (existing) {
        this.adapters.delete(provider);
      }
      for (const key of this.modelAdapters.keys()) {
        if (key.startsWith(`${provider}::`)) this.modelAdapters.delete(key);
      }

      const config = await this.findRepresentativeSlot(provider);

      if (config?.apiKeyEnc) {
        const apiKey = this.encryptionService.decrypt(config.apiKeyEnc);
        const adapter = this.adapterFactory.createFromConfig({
          provider: config.provider,
          sdkType: config.sdkType,
          apiKey,
          baseUrl: config.baseUrl,
          organizationId: config.organizationId,
        });
        this.adapters.set(provider, adapter);
        this.logger.log(`Reloaded adapter for provider: ${provider}`);
      }
    } else {
      // 重新加载所有
      await this.loadAdapters();
    }
  }

  /**
   * 同类型代表槽位解析：最早的启用槽位（类型唯一时代与 findUnique 语义等价）。
   * 无启用槽位时返回 null（适配器只装载启用配置）。
   */
  private async findRepresentativeSlot(provider: string) {
    return this.prisma.aIProviderConfig.findFirst({
      where: { provider, enabled: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 按 provider + model 获取适配器
   * model 缺省时取该 provider 的默认模型
   */
  getAdapter(provider: string, _model?: string): ModelAdapter | null {
    return this.adapters.get(provider) || null;
  }

  /**
   * 按显式模型解析适配器（内置模型消费口）：
   * 默认适配器模型一致或缓存命中时零 IO 返回，否则读 DB 惰性构建并缓存
   */
  async resolveAdapter(
    provider: string,
    model: string,
  ): Promise<ModelAdapter | null> {
    const base = this.adapters.get(provider);
    if (base) {
      if (base.getModelName() === model) return base;
    }
    const cacheKey = `${provider}::${model}`;
    const cached = this.modelAdapters.get(cacheKey);
    if (cached) return cached;

    const config = await this.findRepresentativeSlot(provider);
    if (!config?.apiKeyEnc) return null;

    try {
      const apiKey = this.encryptionService.decrypt(config.apiKeyEnc);
      const adapter = this.adapterFactory.createFromConfig({
        provider: config.provider,
        sdkType: config.sdkType,
        apiKey,
        baseUrl: config.baseUrl,
        organizationId: config.organizationId,
        defaultModel: model,
      });
      this.modelAdapters.set(cacheKey, adapter);
      return adapter;
    } catch (error) {
      this.logger.error(
        `Failed to build adapter for ${provider}/${model}: ${error.message}`,
      );
      return null;
    }
  }

  /**
   * 按模型名称查找适配器
   */
  getAdapterByModel(modelName: string): ModelAdapter | null {
    for (const adapter of this.adapters.values()) {
      if (adapter.getModelName() === modelName) {
        return adapter;
      }
    }
    return null;
  }

  /**
   * 获取已注册的适配器列表
   */
  listAdapters(): Array<{ provider: string; model: string }> {
    return Array.from(this.adapters.values()).map((adapter) => ({
      provider: adapter.getProvider(),
      model: adapter.getModelName(),
    }));
  }

  /**
   * 检查 provider 是否有可用的适配器
   */
  hasProvider(provider: string): boolean {
    return this.adapters.has(provider);
  }

  /**
   * 获取 provider 的默认模型
   */
  getDefaultModel(provider: string): string {
    return this.providerDefaultModels.get(provider) || 'gpt-4o';
  }

  /**
   * 获取所有已加载的 provider 列表
   */
  getLoadedProviders(): string[] {
    return Array.from(this.adapters.keys());
  }
}
