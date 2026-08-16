import { Injectable, Logger } from '@nestjs/common';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { LanguageModel } from 'ai';
import { generateText, streamText, CoreMessage } from 'ai';
import {
  ModelAdapter,
  ChatMessage,
  ChatResponse,
  ValidationResult,
} from './model-adapter.interface';

/**
 * AI SDK 类型
 */
export type SdkType = 'openai' | 'anthropic' | 'google';

/**
 * AiSdkAdapter 构造参数
 */
export interface AiSdkAdapterOptions {
  provider: string; // openai | anthropic | gemini | deepseek | glm
  sdkType: SdkType;
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
  defaultModel: string;
}

/**
 * 通用 AI SDK 适配器
 * 基于 Vercel AI SDK，支持 OpenAI/Anthropic/Gemini 协议
 */
@Injectable()
export class AiSdkAdapter implements ModelAdapter {
  private readonly logger = new Logger(AiSdkAdapter.name);
  private readonly model: LanguageModel;
  private readonly options: AiSdkAdapterOptions;

  constructor(options: AiSdkAdapterOptions) {
    this.options = options;
    this.model = this.createModel();
  }

  private createModel(): LanguageModel {
    const { sdkType, apiKey, baseUrl, organizationId, defaultModel } =
      this.options;

    try {
      switch (sdkType) {
        case 'openai': {
          const openaiProvider = createOpenAI({
            apiKey,
            baseURL: baseUrl,
            organization: organizationId,
          });
          return openaiProvider.languageModel(defaultModel);
        }

        case 'anthropic': {
          const anthropicProvider = createAnthropic({ apiKey });
          return anthropicProvider.languageModel(defaultModel);
        }

        case 'google': {
          const googleProvider = createGoogleGenerativeAI({ apiKey });
          return googleProvider.languageModel(defaultModel);
        }

        default:
          throw new Error(`Unsupported SDK type: ${sdkType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to create AI model: ${error.message}`);
      throw error;
    }
  }

  getModelName(): string {
    return this.options.defaultModel;
  }

  getProvider(): string {
    return this.options.provider;
  }

  /**
   * 流式聊天
   */
  async *chatStream(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<string, void, unknown> {
    try {
      const result = streamText({
        model: this.model,
        messages: messages as CoreMessage[],
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens,
      });

      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } catch (error) {
      this.logger.error(`Stream error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 非流式聊天
   */
  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatResponse> {
    try {
      const result = await generateText({
        model: this.model,
        messages: messages as CoreMessage[],
        temperature: options?.temperature ?? 0.7,
        maxTokens: options?.maxTokens,
      });

      return {
        content: result.text,
        model: this.options.defaultModel,
        tokens: result.usage
          ? {
              prompt: result.usage.promptTokens,
              completion: result.usage.completionTokens,
              total: result.usage.totalTokens,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error(`Chat error: ${error.message}`);
      throw error;
    }
  }

  /**
   * 校验连接
   * 发送一个最小测试 prompt 来验证 API Key 是否有效
   */
  async validateConnection(): Promise<ValidationResult> {
    try {
      const testResult = await generateText({
        model: this.model,
        messages: [{ role: 'user', content: 'Hi' }],
        maxTokens: 5,
      });

      return {
        valid: true,
        models: [this.options.defaultModel],
      };
    } catch (error) {
      this.logger.warn(`Validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message || 'Connection validation failed',
      };
    }
  }
}
