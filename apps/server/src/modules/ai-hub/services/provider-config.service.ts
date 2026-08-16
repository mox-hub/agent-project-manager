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
} from '../dto/provider-config.dto';

/**
 * Provider 配置服务
 * 处理 AI Provider 的 CRUD 操作和验证
 */
@Injectable()
export class ProviderConfigService {
  private readonly logger = new Logger(ProviderConfigService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly messageBus: MessageBusService,
    private readonly adapterRegistry: AdapterRegistryService,
    private readonly adapterFactory: AiSdkAdapterFactory,
  ) {}

  /**
   * 获取所有 Provider 配置
   */
  async listProviders(): Promise<ProviderConfigResponseDto[]> {
    const providers = await this.prisma.aIProviderConfig.findMany({
      orderBy: { provider: 'asc' },
    });

    return providers.map(this.toResponseDto);
  }

  /**
   * 获取单个 Provider 配置
   */
  async getProvider(id: string): Promise<ProviderConfigResponseDto> {
    const provider = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    return this.toResponseDto(provider);
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
   * 校验 Provider（不落库）
   */
  async validateProvider(
    dto: ValidateProviderDto,
  ): Promise<ValidateProviderResponseDto> {
    const sdkType = this.getSdkTypeFromEnum(dto.provider);
    const defaultModel = this.getDefaultModel(dto.provider);

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

      return {
        valid: result.valid,
        models: result.models,
        error: result.error,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message || 'Validation failed',
      };
    }
  }

  /**
   * 检测 Provider 的可用模型
   */
  async detectModels(id: string): Promise<string[]> {
    const provider = await this.prisma.aIProviderConfig.findUnique({
      where: { id },
    });

    if (!provider) {
      throw new NotFoundException(`Provider not found: ${id}`);
    }

    if (!provider.apiKeyEnc) {
      throw new BadRequestException('Provider has no API key configured');
    }

    try {
      const apiKey = this.encryptionService.decrypt(provider.apiKeyEnc);
      const sdkType = this.getSdkTypeFromEnum(provider.provider as any);
      const defaultModel = this.getDefaultModel(provider.provider as any);

      // 创建临时适配器
      const adapter = this.adapterFactory.create({
        provider: provider.provider,
        sdkType,
        apiKey,
        baseUrl: provider.baseUrl || undefined,
        organizationId: provider.organizationId || undefined,
        defaultModel,
      });

      const result = await adapter.validateConnection();

      // 可选：批量 upsert 到 AIModelConfig
      if (result.models && result.models.length > 0) {
        for (const modelName of result.models) {
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
      }

      return result.models || [];
    } catch (error) {
      this.logger.error(`Failed to detect models: ${error.message}`);
      throw new BadRequestException(`Model detection failed: ${error.message}`);
    }
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
      const defaultModel = this.getDefaultModel(provider.provider as any);

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
   * 获取默认模型
   */
  private getDefaultModel(provider: string): string {
    const defaults: Record<string, string> = {
      openai: 'gpt-4o',
      anthropic: 'claude-sonnet-4-20250514',
      gemini: 'gemini-1.5-flash',
      deepseek: 'deepseek-chat',
      glm: 'glm-4',
    };
    return defaults[provider] || 'gpt-4o';
  }
}
