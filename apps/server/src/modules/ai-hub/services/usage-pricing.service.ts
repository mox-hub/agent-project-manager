import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma.service';
import { ModelsDevService } from './models-dev.service';

export interface UsageCostInput {
  modelName: string;
  provider: string;
  promptTokens: number;
  completionTokens: number;
}

/**
 * AI 用量成本估算 —— AIUsageLog.estimatedCost 的唯一计算口径。
 * 优先级：AIModelConfig.costPer1kTokens（按名/提供方匹配，混合价，用户显式覆盖）→
 * models.dev 分项参考价（USD/百万：prompt×input + completion×output，CAP-A-21）→
 * 内置常见模型单价表（USD / 1k tokens，混合）→ 无法估价返回 null。
 */
@Injectable()
export class UsagePricingService {
  private readonly logger = new Logger(UsagePricingService.name);

  /** 内置混合单价（USD / 1k tokens）；AIModelConfig.costPer1kTokens 可覆盖 */
  private static readonly BUILT_IN_USD_PER_1K: Array<{
    match: string[];
    price: number;
  }> = [
    { match: ['gpt-4o-mini'], price: 0.0006 },
    { match: ['gpt-4o'], price: 0.005 },
    { match: ['gpt-4.1-mini'], price: 0.0011 },
    { match: ['gpt-4.1'], price: 0.006 },
    { match: ['deepseek-chat', 'deepseek-v3'], price: 0.0007 },
    { match: ['deepseek-reasoner', 'deepseek-r1'], price: 0.0022 },
    { match: ['glm-4.5', 'glm-4-plus', 'glm-4-air'], price: 0.0014 },
    { match: ['glm-4-flash'], price: 0.0002 },
    { match: ['claude-3-5-haiku', 'claude-haiku'], price: 0.002 },
    { match: ['claude-sonnet'], price: 0.009 },
    { match: ['claude-opus'], price: 0.045 },
  ];

  constructor(
    private readonly prisma: PrismaService,
    private readonly modelsDev: ModelsDevService,
  ) {}

  async estimateCostUsd(input: UsageCostInput): Promise<number | null> {
    const promptTokens = Math.max(0, input.promptTokens || 0);
    const completionTokens = Math.max(0, input.completionTokens || 0);
    const totalTokens = promptTokens + completionTokens;
    if (totalTokens === 0) return null;

    const configured = await this.resolveConfiguredPer1kTokens(input);
    if (configured != null) return blendedCost(totalTokens, configured);

    // models.dev 分项参考价：prompt/completion 分别计价（cache token 暂并入 prompt 价）
    const ref = this.modelsDev.resolveItemizedPrice(
      input.provider,
      input.modelName,
    );
    if (ref) {
      return Number(
        (
          (promptTokens * ref.inputPerM + completionTokens * ref.outputPerM) /
          1_000_000
        ).toFixed(6),
      );
    }

    const builtIn = this.resolveBuiltInPer1kTokens(input.modelName);
    if (builtIn != null) return blendedCost(totalTokens, builtIn);
    return null;
  }

  private async resolveConfiguredPer1kTokens(
    input: UsageCostInput,
  ): Promise<number | null> {
    try {
      const configs = await this.prisma.aIModelConfig.findMany({
        where: { enabled: true },
        select: { name: true, provider: true, costPer1kTokens: true },
      });
      const modelLower = input.modelName.toLowerCase();

      const exact = configs.find(
        (c) => c.costPer1kTokens != null && c.name.toLowerCase() === modelLower,
      );
      if (exact?.costPer1kTokens != null) return exact.costPer1kTokens;

      const partial = configs.find(
        (c) =>
          c.costPer1kTokens != null &&
          (modelLower.includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(modelLower)),
      );
      if (partial?.costPer1kTokens != null) return partial.costPer1kTokens;

      const byProvider = configs.find(
        (c) =>
          c.costPer1kTokens != null &&
          c.provider.toLowerCase() === input.provider.toLowerCase(),
      );
      if (byProvider?.costPer1kTokens != null)
        return byProvider.costPer1kTokens;
    } catch (e) {
      this.logger.warn(
        `AIModelConfig pricing lookup failed: ${(e as Error).message}`,
      );
    }
    return null;
  }

  private resolveBuiltInPer1kTokens(modelName: string): number | null {
    const lowered = modelName.toLowerCase();
    for (const rule of UsagePricingService.BUILT_IN_USD_PER_1K) {
      if (rule.match.some((m) => lowered.includes(m))) return rule.price;
    }
    return null;
  }
}

function blendedCost(totalTokens: number, per1k: number): number {
  return Number(((totalTokens / 1000) * per1k).toFixed(6));
}
