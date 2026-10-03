import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';

/**
 * quick-judge 通道设置（CAP-A-27）。
 *
 * 存储：AppConfig 全局键 `ai.quickJudge`，value 形如
 * `{ enabled: boolean, provider?: string, model?: string, baseUrl?: string }`。
 * 缺省 enabled=false（保守默认：不配置就完全不走判断通道，行为与现状一致）；
 * provider 槽位名指向 AIProviderConfig（默认 `opencode-go`，key 从该槽位解密）；
 * model 固定版本号（忌 latest 别名漂移，默认 `jev-1.13-free`）。
 * 读取异常回落缺省——通道失效绝不影响主流程。
 */
export interface QuickJudgeSettings {
  enabled: boolean;
  provider: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  /**
   * P1-C：intake 两评估场景（readiness/decomposition）改走 quick-judge「枚举快筛」档
   * （只出三态+verdict，无缺口账/证据文本）。双闸之一——还须 enabled=true 才生效；
   * 关闭时照旧走原大模型通道出完整评估。
   */
  intakeReviewViaJudge: boolean;
}

export const QUICK_JUDGE_DEFAULTS: Omit<
  QuickJudgeSettings,
  'enabled' | 'intakeReviewViaJudge'
> = {
  provider: 'opencode-go',
  model: 'jev-1.13-free',
  baseUrl: 'https://opencode.ai/zen/v1',
  timeoutMs: 8000,
};

@Injectable()
export class QuickJudgeSettingsService {
  static readonly CONFIG_KEY = 'ai.quickJudge';

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(): Promise<QuickJudgeSettings> {
    try {
      const row = await this.prisma.appConfig.findFirst({
        where: { key: QuickJudgeSettingsService.CONFIG_KEY, scope: 'global' },
      });
      const value = (row?.value ?? {}) as Record<string, unknown>;
      return {
        enabled: value.enabled === true,
        intakeReviewViaJudge: value.intakeReviewViaJudge === true,
        provider:
          typeof value.provider === 'string' && value.provider
            ? value.provider
            : QUICK_JUDGE_DEFAULTS.provider,
        model:
          typeof value.model === 'string' && value.model
            ? value.model
            : QUICK_JUDGE_DEFAULTS.model,
        baseUrl:
          typeof value.baseUrl === 'string' && value.baseUrl
            ? value.baseUrl
            : QUICK_JUDGE_DEFAULTS.baseUrl,
        timeoutMs:
          typeof value.timeoutMs === 'number' && value.timeoutMs > 0
            ? value.timeoutMs
            : QUICK_JUDGE_DEFAULTS.timeoutMs,
      };
    } catch {
      return {
        enabled: false,
        intakeReviewViaJudge: false,
        ...QUICK_JUDGE_DEFAULTS,
      };
    }
  }

  /** 写入设置（管理员写路径）。null 字段表示回落缺省。 */
  async updateSettings(
    patch: Partial<
      Pick<
        QuickJudgeSettings,
        'enabled' | 'provider' | 'model' | 'baseUrl' | 'intakeReviewViaJudge'
      >
    >,
    actorId?: string,
  ): Promise<QuickJudgeSettings> {
    const current = await this.getSettings();
    const next: QuickJudgeSettings = {
      ...current,
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
      ...(patch.intakeReviewViaJudge !== undefined
        ? { intakeReviewViaJudge: patch.intakeReviewViaJudge }
        : {}),
      ...(patch.provider !== undefined
        ? { provider: patch.provider || QUICK_JUDGE_DEFAULTS.provider }
        : {}),
      ...(patch.model !== undefined
        ? { model: patch.model || QUICK_JUDGE_DEFAULTS.model }
        : {}),
      ...(patch.baseUrl !== undefined
        ? { baseUrl: patch.baseUrl || QUICK_JUDGE_DEFAULTS.baseUrl }
        : {}),
    };

    const existing = await this.prisma.appConfig.findFirst({
      where: { key: QuickJudgeSettingsService.CONFIG_KEY, scope: 'global' },
    });
    const data = {
      value: {
        enabled: next.enabled,
        intakeReviewViaJudge: next.intakeReviewViaJudge,
        provider: next.provider,
        model: next.model,
        baseUrl: next.baseUrl,
      },
      updatedBy: actorId ?? null,
      updatedAt: new Date(),
    };
    if (existing) {
      await this.prisma.appConfig.update({ where: { id: existing.id }, data });
    } else {
      await this.prisma.appConfig.create({
        data: {
          key: QuickJudgeSettingsService.CONFIG_KEY,
          scope: 'global',
          description:
            'AI 快速判断通道（quick-judge，CAP-A-27）：enabled 默认关；provider 指向 AIProviderConfig 槽位名；model 固定版本号',
          createdBy: actorId ?? null,
          ...data,
        },
      });
    }
    return next;
  }
}
