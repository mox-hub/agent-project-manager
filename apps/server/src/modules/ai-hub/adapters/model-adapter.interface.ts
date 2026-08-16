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

/**
 * 连接校验结果
 */
export interface ValidationResult {
  valid: boolean;
  models?: string[];
  error?: string;
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

  /**
   * 校验连接有效性
   * - 尝试发起一个简单的 chat 请求来验证 API Key 是否有效
   * - 可选地返回可用的模型列表
   */
  validateConnection(): Promise<ValidationResult>;
}
