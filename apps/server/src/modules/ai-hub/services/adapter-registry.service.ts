import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { EncryptionService } from '../../../core/crypto/encryption.service';
import { AiSdkAdapterFactory } from '../adapters/ai-sdk-adapter.factory';
import { AiSdkAdapter } from '../adapters/ai-sdk-adapter';
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
    this.providerDefaultModels.clear();

    const providers = await this.prisma.aIProviderConfig.findMany({
      where: { enabled: true },
    });

    for (const provider of providers) {
      if (!provider.apiKeyEnc) {
        this.logger.log(`Provider ${provider.provider} has no API key, skipping`);
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
      // 重新加载单个 provider
      const existing = this.adapters.get(provider);
      if (existing) {
        this.adapters.delete(provider);
      }
      
      const config = await this.prisma.aIProviderConfig.findUnique({
        where: { provider },
      });

      if (config?.enabled && config.apiKeyEnc) {
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
   * 按 provider + model 获取适配器
   * model 缺省时取该 provider 的默认模型
   */
  getAdapter(provider: string, model?: string): ModelAdapter | null {
    return this.adapters.get(provider) || null;
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
