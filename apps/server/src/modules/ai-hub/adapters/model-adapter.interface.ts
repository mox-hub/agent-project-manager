export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  content: string;
  model: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface ModelAdapter {
  /**
   * 获取模型名称
   */
  getModelName(): string;

  /**
   * 获取提供商名称
   */
  getProvider(): string;

  /**
   * 执行聊天请求（流式）
   */
  chatStream(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): AsyncGenerator<string, void, unknown>;

  /**
   * 执行聊天请求（非流式）
   */
  chat(
    messages: ChatMessage[],
    options?: {
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<ChatResponse>;
}
