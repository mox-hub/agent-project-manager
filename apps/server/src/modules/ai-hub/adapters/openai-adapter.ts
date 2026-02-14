import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '../../../core/config/config.service';
import {
  ModelAdapter,
  ChatMessage,
  ChatResponse,
} from './model-adapter.interface';

@Injectable()
export class OpenAIAdapter implements ModelAdapter {
  private readonly logger = new Logger(OpenAIAdapter.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get('OPENAI_API_KEY') || '';
    this.baseUrl =
      this.configService.get('OPENAI_BASE_URL') ||
      'https://api.openai.com/v1';
    this.defaultModel = this.configService.get('OPENAI_MODEL') || 'gpt-4o';

    if (!this.apiKey) {
      this.logger.warn('OpenAI API key not configured');
    }
  }

  getModelName(): string {
    return this.defaultModel;
  }

  getProvider(): string {
    return 'openai';
  }

  async *chatStream(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): AsyncGenerator<string, void, unknown> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                yield delta;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('OpenAI stream error', error);
      throw error;
    }
  }

  async chat(
    messages: ChatMessage[],
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<ChatResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.defaultModel,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      return {
        content: choice?.message?.content || '',
        model: data.model || this.defaultModel,
        tokens: data.usage
          ? {
              prompt: data.usage.prompt_tokens,
              completion: data.usage.completion_tokens,
              total: data.usage.total_tokens,
            }
          : undefined,
      };
    } catch (error) {
      this.logger.error('OpenAI chat error', error);
      throw error;
    }
  }
}
