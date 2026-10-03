import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { QuickJudgeService } from '@/modules/ai-hub/quick-judge/quick-judge.service';

/**
 * 验收标准「预估达成概率」（CAP-A-27 扩展批二）。
 *
 * 判定语义：基于每条标准的当前证据状态（类型/数量/通过态），JEV Score 十档输出
 * 「该标准当前已达成」的预估概率（0-100）。**advisory 展示位**——只写
 * criteria.metadata.acceptanceProbability 供前端概率条渲染，绝不改 status/passedAt，
 * 不进任何门禁。标准文本虽是用户自由文本，但判定结果无自动动作面（自己标准的
 * 自己展示），防操纵约束放宽至此并在 state 组装处注记。
 *
 * 缓存：内容指纹 = criteriaId + revision + content + 证据签名；命中直接回缓存，
 * 不重复调用判断通道（面板可反复打开）。
 */

const MAX_BATCH = 40;
const SCORE_CRITERIA = [
  '0-10 几乎无证据',
  '20-30 证据薄弱',
  '40-50 部分证据',
  '60-70 多数证据到位',
  '80-90 证据充分',
  '100 完全达成',
];

export interface CriteriaProbabilityItem {
  criteriaId: string;
  /** 预估达成概率 0-100；判定不可用时 null */
  probability: number | null;
  confidence: number | null;
  cached: boolean;
  model?: string;
}

@Injectable()
export class AcceptanceProbabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quickJudge: QuickJudgeService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AcceptanceProbabilityService');
  }

  async judgeAcceptance(params: {
    acceptanceId: string;
    criteriaIds?: string[];
  }): Promise<{ items: CriteriaProbabilityItem[]; model?: string }> {
    const criteria = await this.prisma.acceptanceCriteria.findMany({
      where: {
        acceptanceId: params.acceptanceId,
        ...(params.criteriaIds?.length
          ? { id: { in: params.criteriaIds } }
          : {}),
      },
      orderBy: { order: 'asc' },
      include: {
        evidences: {
          select: { evidenceType: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    const evidenceByCriteria = new Map<string, string[]>();
    for (const c of criteria) {
      evidenceByCriteria.set(
        c.id,
        c.evidences.map((e) => e.evidenceType),
      );
    }

    const items = new Map<string, CriteriaProbabilityItem>();
    const pending: (typeof criteria)[number][] = [];

    for (const c of criteria) {
      const evidenceTypes = evidenceByCriteria.get(c.id) ?? [];
      const fingerprint = this.fingerprint(c, evidenceTypes);
      const cachedMeta = (c.metadata as Record<string, unknown> | null)
        ?.acceptanceProbability as
        | {
            fingerprint: string;
            probability: number;
            confidence: number | null;
            model?: string;
          }
        | undefined;
      if (
        cachedMeta?.fingerprint === fingerprint &&
        typeof cachedMeta.probability === 'number'
      ) {
        items.set(c.id, {
          criteriaId: c.id,
          probability: cachedMeta.probability,
          confidence: cachedMeta.confidence ?? null,
          cached: true,
          model: cachedMeta.model,
        });
      } else {
        pending.push(c);
      }
    }

    let model: string | undefined;
    if (pending.length > 0) {
      if (pending.length > MAX_BATCH) {
        this.logger.warn(
          `acceptance probability batch too large: ${pending.length}, truncating to ${MAX_BATCH}`,
        );
      }
      const batch = pending.slice(0, MAX_BATCH);
      const state = batch
        .map((c) => {
          const evidenceTypes = evidenceByCriteria.get(c.id) ?? [];
          const counts = new Map<string, number>();
          for (const t of evidenceTypes)
            counts.set(t, (counts.get(t) ?? 0) + 1);
          const evSig =
            evidenceTypes.length === 0
              ? '无任何证据'
              : [...counts.entries()].map(([t, n]) => `${t}×${n}`).join('、');
          // 防操纵注记：标准内容为用户自由文本，但本场景判定仅影响展示预估，
          // 无自动动作面；证据侧只给类型计数（系统结构化字段）。
          return `标准 ${c.id}（类型 ${c.criteriaType}，严重度 ${c.severity}，当前状态 ${c.status}）\n内容：${c.content}\n当前证据：${evSig}`;
        })
        .join('\n\n');

      const result = await this.quickJudge.judge(
        'acceptance_probability',
        `验收标准达成概率评估。依据每条标准的证据完备程度，输出该标准当前已达成的概率（0-100 分）。\n\n${state}`,
        batch.map((c) => ({
          id: c.id,
          type: 'score' as const,
          instructions: '该验收标准基于当前证据已达成的概率（0-100）',
          criteria: SCORE_CRITERIA,
        })),
      );

      if (result) {
        model = result.model;
        for (const c of batch) {
          const ans = result.answers[c.id];
          const raw = typeof ans?.score === 'number' ? ans.score : null;
          // score 档位空间 0-9 → 0-100（十档口径 ×100/9）
          const probability =
            raw === null
              ? null
              : Math.max(0, Math.min(100, Math.round((raw * 100) / 9)));
          items.set(c.id, {
            criteriaId: c.id,
            probability,
            confidence:
              typeof ans?.confidence === 'number' ? ans.confidence : null,
            cached: false,
            model: result.model,
          });
          if (probability !== null) {
            await this.persist(c.id, c, evidenceByCriteria.get(c.id) ?? [], {
              fingerprint: this.fingerprint(
                c,
                evidenceByCriteria.get(c.id) ?? [],
              ),
              probability,
              confidence:
                typeof ans?.confidence === 'number' ? ans.confidence : null,
              model: result.model,
              judgedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // judge 不可用/场景禁用：pending 项回 null（前端整块隐藏，advisory 纪律）
    for (const c of pending) {
      if (!items.has(c.id)) {
        items.set(c.id, {
          criteriaId: c.id,
          probability: null,
          confidence: null,
          cached: false,
        });
      }
    }

    return {
      items: criteria
        .map((c) => items.get(c.id))
        .filter((x): x is CriteriaProbabilityItem => !!x),
      model,
    };
  }

  /** 内容指纹：标准内容/版本/证据签名任一变化即失效缓存。 */
  private fingerprint(
    c: { id: string; revision: number; content: string; status: string },
    evidenceTypes: string[],
  ): string {
    const evidenceSig = [...evidenceTypes].sort().join(',');
    return createHash('sha1')
      .update(`${c.id}:${c.revision}:${c.status}:${c.content}:${evidenceSig}`)
      .digest('hex');
  }

  /** 回写 criteria.metadata.acceptanceProbability（合并不覆盖其他键）。 */
  private async persist(
    _criteriaId: string,
    criteria: { id: string; metadata: unknown },
    _evidenceTypes: string[],
    payload: {
      fingerprint: string;
      probability: number;
      confidence: number | null;
      model?: string;
      judgedAt: string;
    },
  ) {
    try {
      const current =
        typeof criteria.metadata === 'object' && criteria.metadata !== null
          ? (criteria.metadata as Record<string, unknown>)
          : {};
      await this.prisma.acceptanceCriteria.update({
        where: { id: criteria.id },
        data: {
          metadata: {
            ...current,
            acceptanceProbability: {
              fingerprint: payload.fingerprint,
              probability: payload.probability,
              confidence: payload.confidence,
              ...(payload.model ? { model: payload.model } : {}),
              judgedAt: payload.judgedAt,
            },
          },
        },
      });
    } catch (err) {
      this.logger.warn(
        `acceptance probability persist failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
