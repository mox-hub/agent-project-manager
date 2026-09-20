import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import {
  EXPERTISE_DOMAINS,
  EXPERTISE_DOMAIN_LABELS,
  isExpertiseDomain,
} from '@/modules/playbook/playbook.registry';
import {
  ExpertiseDomainDto,
  ExpertiseFeedbackDto,
  ExpertiseResponseDto,
} from './dto/expertise.dto';

/**
 * 专长度档位（v2 纪要 §2.1「专长度是向量，不是二分类」）：
 * 按 人 × 领域 存 Store B 偏好原子（scope=user:{userId}, type=preference），
 * 不建模"新手/老手"标签。静默学习：知识层被折叠忽略 ≥3 次 → 该领域密度自动降
 * （terse）；主动追问 → 回升 detailed；"别再解释这类" → suppressed（手动纠偏）。
 * 档位按人不按项目存——同一张决策卡对不同人渲染不同夹层。
 */
@Injectable()
export class ExpertiseService {
  private readonly logger = new Logger(ExpertiseService.name);

  /** 折叠忽略阈值：连续忽略达此次数自动降为 terse（v1 §6「被忽略 3 次不再提」） */
  static readonly IGNORE_THRESHOLD = 3;

  constructor(private readonly prisma: PrismaService) {}

  /** 当前用户各领域档位（无原子 = 默认 detailed） */
  async getExpertise(userId: string): Promise<ExpertiseResponseDto> {
    const rows = await this.prisma.memoryAtom.findMany({
      where: { scope: this.userScope(userId), type: 'preference' },
    });
    const byDomain = new Map<string, ExpertiseDomainDto>();
    for (const row of rows) {
      const refs = row.refs as { domain?: string } | null;
      const domain = refs?.domain;
      if (!domain || !isExpertiseDomain(domain)) continue;
      const level = this.readLevel(row.refs);
      if (level === 'detailed' && row.lifecycle === 'pruned') continue;
      byDomain.set(domain, {
        domain,
        level,
        ignoreCount: this.readIgnoreCount(row.refs),
        updatedAt: row.updatedAt.toISOString(),
      });
    }
    return {
      domains: EXPERTISE_DOMAINS.map(
        (domain): ExpertiseDomainDto =>
          byDomain.get(domain) ?? { domain, level: 'detailed', ignoreCount: 0 },
      ),
    };
  }

  /** 学习信号落库：同一领域同一原子原地更新（不膨胀记忆） */
  async feedback(
    userId: string,
    dto: ExpertiseFeedbackDto,
  ): Promise<ExpertiseDomainDto> {
    if (!isExpertiseDomain(dto.domain)) {
      throw new BadRequestException(
        `未知专长度领域：${dto.domain}（可用：${EXPERTISE_DOMAINS.join('、')}）`,
      );
    }
    const scope = this.userScope(userId);
    const content = this.atomContent(dto.domain);
    const existing = await this.prisma.memoryAtom.findFirst({
      where: {
        scope,
        type: 'preference',
        content,
        lifecycle: { not: 'pruned' },
      },
    });

    let level = this.readLevel(existing?.refs);
    let ignoreCount = this.readIgnoreCount(existing?.refs);

    switch (dto.signal) {
      case 'ignored':
        ignoreCount += 1;
        if (
          ignoreCount >= ExpertiseService.IGNORE_THRESHOLD &&
          level === 'detailed'
        ) {
          level = 'terse';
        }
        break;
      case 'asked':
        level = 'detailed';
        ignoreCount = 0;
        break;
      case 'suppress':
        level = 'suppressed';
        break;
      case 'reset':
        level = 'detailed';
        ignoreCount = 0;
        break;
      default:
        throw new BadRequestException(`未知学习信号：${dto.signal}`);
    }

    const refs = {
      domain: dto.domain,
      domainLabel: EXPERTISE_DOMAIN_LABELS[dto.domain],
      level,
      ignoreCount,
      lastSignal: dto.signal,
      ...(dto.context ? { context: dto.context } : {}),
    };

    if (existing) {
      await this.prisma.memoryAtom.update({
        where: { id: existing.id },
        data: { refs: refs as unknown as Prisma.InputJsonValue, confidence: 1 },
      });
    } else {
      await this.prisma.memoryAtom.create({
        data: {
          scope,
          type: 'preference',
          content,
          confidence: 1,
          refs: refs as unknown as Prisma.InputJsonValue,
          sourceType: 'manual',
          lifecycle: 'working',
          createdBy: userId,
        },
      });
    }
    this.logger.log(
      `expertise feedback: user=${userId} domain=${dto.domain} signal=${dto.signal} -> ${level}`,
    );
    return { domain: dto.domain, level, ignoreCount };
  }

  // ─── 内部 ───

  private userScope(userId: string): string {
    return `user:${userId}`;
  }

  private atomContent(domain: string): string {
    return `expertise:${domain}`;
  }

  private readLevel(refs: unknown): 'detailed' | 'terse' | 'suppressed' {
    const level = (refs as { level?: string } | null)?.level;
    return level === 'terse' || level === 'suppressed' ? level : 'detailed';
  }

  private readIgnoreCount(refs: unknown): number {
    const n = (refs as { ignoreCount?: number } | null)?.ignoreCount;
    return typeof n === 'number' && n > 0 ? n : 0;
  }
}
