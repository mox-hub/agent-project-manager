import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { EncryptionService } from '@/core/crypto/encryption.service';
import {
  QuickJudgeSettingsService,
  QuickJudgeSettings,
} from './quick-judge-settings.service';

/**
 * quick-judge 判断通道（CAP-A-27）：System One 模型的毫秒级初审层。
 *
 * 协议：opencode Zen 网关原生 System One 端点（2026-10-02 实机验证）——
 * `POST {baseUrl}/systemone`，questions 是**以问题 ID 为键的对象**（数组形态 422）；
 * choice 选项在 criteria 对象、score 档位在 criteria 数组；noul 返回 0-1 概率无
 * confidence、choice 返回 choice+confidence+probabilities、**score 返回档位空间
 * 0-9 的连续分数**（十档口径 ×100/9 折算 0-100）。
 *
 * 纪律（GAP-T-60）：①本服务**绝不抛错**——任何失败（未启用/key 缺失/网络/超时/
 * 响应畸形）返回 null 由调用方回落规则层；②记账 AIUsageLog `kind='judge'`；
 * ③防操纵边界由调用方保证——state 只允许系统结构化字段，不收用户自由文本。
 */

export interface QuickJudgeQuestion {
  id: string;
  type: 'noul' | 'choice' | 'score';
  instructions: string;
  /** choice：选项 ID → 中文判据；score：档位标签数组（2-10 档） */
  criteria?: Record<string, string> | string[];
}

export interface QuickJudgeAnswer {
  type: 'noul' | 'choice' | 'score';
  /** noul：0-1 概率（即信念，无 confidence 字段） */
  noul?: number;
  choice?: string;
  confidence?: number;
  probabilities?: Record<string, number>;
  /** score：档位空间分数（0 到 档数-1，可落档间） */
  score?: number;
}

export interface QuickJudgeResult {
  scenario: string;
  model: string;
  answers: Record<string, QuickJudgeAnswer>;
  usage: { inputTokens: number; outputTokens: number };
}

@Injectable()
export class QuickJudgeService {
  private readonly enabledScenarios = new Set([
    'approval_risk',
    'evidence_precheck',
    'intake_readiness',
    'intake_decomposition',
    'contract_drift',
    'trust_evaluation',
    'decision_suggestion',
    'workflow_judge',
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly encryption: EncryptionService,
    private readonly settings: QuickJudgeSettingsService,
  ) {
    this.logger.setContext('QuickJudgeService');
  }

  /**
   * 判断入口。任何失败返回 null（调用方回落规则层），成功则顺带完成 AIUsageLog 记账。
   * state 必须是系统生成的结构化内容——调用方不得把用户/被执行 AI 可自由编写的
   * 文本直接塞入（防操纵边界，见类注释）。
   */
  async judge(
    scenario: string,
    state: string,
    questions: QuickJudgeQuestion[],
  ): Promise<QuickJudgeResult | null> {
    if (!this.enabledScenarios.has(scenario)) {
      this.logger.warn(`quick-judge scenario not registered: ${scenario}`);
      return null;
    }

    const config = await this.resolveChannel();
    if (!config) return null;
    const { settings: s, apiKey } = config;

    const questionMap: Record<string, Omit<QuickJudgeQuestion, 'id'>> = {};
    for (const q of questions) {
      questionMap[q.id] = { type: q.type, instructions: q.instructions };
      if (q.criteria !== undefined) questionMap[q.id].criteria = q.criteria;
    }

    let http: Response;
    try {
      http = await fetch(`${s.baseUrl}/systemone`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'x-opencode-session': randomUUID(),
        },
        body: JSON.stringify({ model: s.model, state, questions: questionMap }),
        signal: AbortSignal.timeout(s.timeoutMs),
      });
    } catch (err) {
      this.logger.warn(
        `quick-judge ${scenario} fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }

    let payload: {
      model?: string;
      answers?: Record<string, QuickJudgeAnswer>;
      usage?: { input_tokens?: number; output_tokens?: number };
      error?: { message?: string };
    };
    try {
      payload = await http.json();
    } catch {
      this.logger.warn(
        `quick-judge ${scenario} non-JSON response (HTTP ${http.status})`,
      );
      return null;
    }

    if (!http.ok || !payload.answers) {
      this.logger.warn(
        `quick-judge ${scenario} failed: HTTP ${http.status} ${payload.error?.message ?? ''}`.trim(),
      );
      return null;
    }

    const inputTokens = payload.usage?.input_tokens ?? 0;
    const outputTokens = payload.usage?.output_tokens ?? 0;
    const model = payload.model ?? s.model;

    // 记账（对齐 assistant-silent 先例：失败仅告警不抛）
    try {
      await this.prisma.aIUsageLog.create({
        data: {
          modelName: model,
          provider: s.provider,
          promptTokens: inputTokens,
          completionTokens: outputTokens,
          totalTokens: inputTokens + outputTokens,
          estimatedCost: null, // judge 通道输入 $0.042/MTok、输出免费，价目源未覆盖前不估 0
          responseMetadata: { kind: 'judge', scenario },
        },
      });
    } catch (err) {
      this.logger.warn(
        `quick-judge usage log failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return {
      scenario,
      model,
      answers: payload.answers,
      usage: { inputTokens, outputTokens },
    };
  }

  /** 通道可用性 + key 解析。未启用/key 缺失返回 null。 */
  private async resolveChannel(): Promise<{
    settings: QuickJudgeSettings;
    apiKey: string;
  } | null> {
    const s = await this.settings.getSettings();
    if (!s.enabled) return null;

    const slot = await this.prisma.aIProviderConfig.findFirst({
      where: { provider: s.provider, enabled: true, apiKeyEnc: { not: null } },
      orderBy: { createdAt: 'asc' },
    });
    if (!slot?.apiKeyEnc) {
      this.logger.warn(
        `quick-judge provider slot missing or keyless: ${s.provider}`,
      );
      return null;
    }
    try {
      return { settings: s, apiKey: this.encryption.decrypt(slot.apiKeyEnc) };
    } catch (err) {
      this.logger.warn(
        `quick-judge key decrypt failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return null;
    }
  }
}
