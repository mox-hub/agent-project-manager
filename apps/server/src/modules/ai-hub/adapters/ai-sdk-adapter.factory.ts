import { Injectable } from '@nestjs/common';
import { AiSdkAdapter, AiSdkAdapterOptions, SdkType } from './ai-sdk-adapter';

/**
 * AI SDK 适配器工厂
 * 根据配置动态创建 AiSdkAdapter 实例
 */
@Injectable()
export class AiSdkAdapterFactory {
  /**
   * 创建适配器实例
   */
  create(options: AiSdkAdapterOptions): AiSdkAdapter {
    return new AiSdkAdapter(options);
  }

  /**
   * 从 provider 配置创建适配器
   */
  createFromConfig(config: {
    provider: string;
    sdkType: string;
    apiKey: string;
    baseUrl?: string | null;
    organizationId?: string | null;
    defaultModel?: string;
  }): AiSdkAdapter {
    const sdkType = this.normalizeSdkType(config.sdkType);
    const defaultModel =
      config.defaultModel || this.getDefaultModel(config.provider);

    return this.create({
      provider: config.provider,
      sdkType,
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || undefined,
      organizationId: config.organizationId || undefined,
      defaultModel,
    });
  }

  /**
   * 标准化 SDK 类型
   */
  private normalizeSdkType(sdkType: string): SdkType {
    switch (sdkType.toLowerCase()) {
      case 'openai':
        return 'openai';
      case 'anthropic':
        return 'anthropic';
      case 'google':
        return 'google';
      default:
        return 'openai'; // 默认使用 OpenAI 协议（DeepSeek/GLM 都兼容）
    }
  }

  /**
   * 获取 provider 的默认模型
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
