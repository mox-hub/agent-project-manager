import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import { ProposalService } from '../decision/proposal.service';
import {
  CLARIFY_ROUND_LIMIT,
  CollaborationCardWithNamesDto,
} from './dto/collaboration.dto';

/**
 * 接口协作卡状态机（AI 同事化 · 交接试点）。
 * 定调：「对话建立理解，工件建立信任」——交接靠工件+结构化状态机，不靠聊天；
 * 每步流转是事件（messageBus → 通知），不是聊天记录。
 *
 * 流转：
 *   requested --respond(committed|rejected|clarify)--> committed | rejected | requested(轮次+1)
 *   澄清超上限 → escalated（自动建 clarify 提案，人拍板）
 *   committed --deliver--> delivered --verify(verified)--> verified
 *                     └--verify(changes_requested)--> in_progress
 *   未终态可 cancel
 */

interface CardEvent {
  status: string;
  byMemberId?: string;
  note?: string;
  at: string;
}

type CardRow = {
  id: string;
  projectId: string;
  title: string;
  requesterMemberId: string;
  providerMemberId: string;
  relatedTaskId: string | null;
  payload: unknown;
  status: string;
  rounds: number;
  events: unknown;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class CollaborationService {
  private readonly logger = new Logger(CollaborationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly proposals: ProposalService,
  ) {}

  async list(params: {
    projectId?: string | null;
    status?: string | null;
    limit?: number | null;
  }): Promise<{ items: CollaborationCardWithNamesDto[]; total: number }> {
    const where = {
      ...(params.projectId ? { projectId: params.projectId } : {}),
      ...(params.status ? { status: params.status } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.collaborationCard.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: Math.min(Math.max(1, Number(params.limit ?? 50)), 200),
      }),
      this.prisma.collaborationCard.count({ where }),
    ]);
    return { items: await this.attachNames(rows), total };
  }

  async get(id: string): Promise<CollaborationCardWithNamesDto> {
    const row = await this.prisma.collaborationCard.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('协作卡不存在');
    const [withNames] = await this.attachNames([row]);
    return withNames;
  }

  async create(input: {
    projectId: string;
    title: string;
    requesterMemberId: string;
    providerMemberId: string;
    relatedTaskId?: string | null;
    payload: Record<string, unknown>;
  }): Promise<CollaborationCardWithNamesDto> {
    if (input.requesterMemberId === input.providerMemberId) {
      throw new BadRequestException('请求方与提供方不能是同一成员');
    }
    const [requester, provider] = await Promise.all([
      this.prisma.member.findUnique({ where: { id: input.requesterMemberId } }),
      this.prisma.member.findUnique({ where: { id: input.providerMemberId } }),
    ]);
    if (!requester || !provider) {
      throw new BadRequestException('请求方或提供方成员不存在');
    }
    const row = await this.prisma.collaborationCard.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        requesterMemberId: input.requesterMemberId,
        providerMemberId: input.providerMemberId,
        relatedTaskId: input.relatedTaskId ?? null,
        payload: input.payload as object,
        status: 'requested',
        events: [
          {
            status: 'requested',
            byMemberId: input.requesterMemberId,
            note: '发起接口协作',
            at: new Date().toISOString(),
          },
        ] as unknown as Array<object>,
      },
    });
    this.publish(row, null);
    const [withNames] = await this.attachNames([row]);
    return withNames;
  }

  /** 提供方答复：承诺 / 拒绝 / 需澄清（轮次超限自动升级） */
  async respond(
    id: string,
    input: {
      decision: 'committed' | 'rejected' | 'clarify';
      note?: string;
      byMemberId?: string;
    },
  ): Promise<CollaborationCardWithNamesDto> {
    const row = await this.mustGet(id);
    if (row.status !== 'requested') {
      throw new BadRequestException(
        `仅 requested 状态可答复（当前 ${row.status}）`,
      );
    }
    const byMemberId = input.byMemberId ?? row.providerMemberId;

    if (input.decision === 'committed') {
      return this.transition(row, 'committed', byMemberId, input.note);
    }
    if (input.decision === 'rejected') {
      return this.transition(row, 'rejected', byMemberId, input.note);
    }

    // clarify：轮次 +1；超上限升级 decisions 由人拍板
    const rounds = row.rounds + 1;
    if (rounds > CLARIFY_ROUND_LIMIT) {
      await this.escalate(row, byMemberId, input.note);
      const refreshed = await this.mustGet(id);
      return this.attachOne(refreshed);
    }
    const updated = await this.appendEvent(row, {
      status: row.status,
      byMemberId,
      note: input.note ?? '请求澄清',
      at: new Date().toISOString(),
    });
    const refreshed = await this.prisma.collaborationCard.update({
      where: { id },
      data: { rounds },
    });
    void updated;
    this.publish(row, byMemberId);
    const current = await this.mustGet(id);
    return this.attachOne(current);
  }

  /** 提供方交付（改 spec → 实现 → 契约测试跑绿）；escalated 经人工裁决后可恢复推进 */
  async deliver(
    id: string,
    input: { note?: string; byMemberId?: string },
  ): Promise<CollaborationCardWithNamesDto> {
    const row = await this.mustGet(id);
    if (!['committed', 'in_progress', 'escalated'].includes(row.status)) {
      throw new BadRequestException(
        `仅 committed/in_progress/escalated 状态可交付（当前 ${row.status}）`,
      );
    }
    const updated = await this.transition(
      row,
      'delivered',
      input.byMemberId ?? row.providerMemberId,
      input.note,
    );
    return updated;
  }

  /** 请求方验证：契约绿 → 关闭；打回 → in_progress */
  async verify(
    id: string,
    input: {
      verdict: 'verified' | 'changes_requested';
      note?: string;
      byMemberId?: string;
    },
  ): Promise<CollaborationCardWithNamesDto> {
    const row = await this.mustGet(id);
    if (row.status !== 'delivered') {
      throw new BadRequestException(
        `仅 delivered 状态可验证（当前 ${row.status}）`,
      );
    }
    const next = input.verdict === 'verified' ? 'verified' : 'in_progress';
    return this.transition(
      row,
      next,
      input.byMemberId ?? row.requesterMemberId,
      input.note,
    );
  }

  async cancel(
    id: string,
    input: { note?: string; byMemberId?: string },
  ): Promise<CollaborationCardWithNamesDto> {
    const row = await this.mustGet(id);
    if (['verified', 'rejected', 'cancelled'].includes(row.status)) {
      throw new BadRequestException(`终态不可取消（当前 ${row.status}）`);
    }
    return this.transition(
      row,
      'cancelled',
      input.byMemberId ?? row.requesterMemberId,
      input.note,
    );
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private async mustGet(id: string): Promise<CardRow> {
    const row = await this.prisma.collaborationCard.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('协作卡不存在');
    return row as unknown as CardRow;
  }

  private async transition(
    row: CardRow,
    next: string,
    byMemberId: string,
    note?: string,
  ): Promise<CollaborationCardWithNamesDto> {
    const updated = await this.prisma.collaborationCard.update({
      where: { id: row.id },
      data: {
        status: next,
        events: this.appendEventLocal(row.events, {
          status: next,
          byMemberId,
          note,
          at: new Date().toISOString(),
        }) as unknown as Prisma.InputJsonValue,
      },
    });
    this.publish(updated, byMemberId);
    const current = await this.mustGet(row.id);
    return this.attachOne(current);
  }

  private async appendEvent(row: CardRow, event: CardEvent): Promise<unknown> {
    return this.prisma.collaborationCard.update({
      where: { id: row.id },
      data: {
        events: this.appendEventLocal(
          row.events,
          event,
        ) as unknown as Prisma.InputJsonValue,
      },
    });
  }

  private appendEventLocal(existing: unknown, event: CardEvent): CardEvent[] {
    const list = Array.isArray(existing) ? (existing as CardEvent[]) : [];
    return [...list, event];
  }

  /** 澄清死循环的出口：升级 decisions，人拍板（escalated 后人工经 REST 恢复流转） */
  private async escalate(
    row: CardRow,
    byMemberId: string,
    note?: string,
  ): Promise<void> {
    await this.prisma.collaborationCard.update({
      where: { id: row.id },
      data: {
        status: 'escalated',
        events: this.appendEventLocal(row.events, {
          status: 'escalated',
          byMemberId,
          note: note ?? '澄清轮次超限，升级人类拍板',
          at: new Date().toISOString(),
        }) as unknown as Prisma.InputJsonValue,
      },
    });
    await this.proposals.create({
      kind: 'clarify',
      projectId: row.projectId,
      title: `协作卡澄清超限：${row.title}`,
      detail:
        note ?? '双方澄清超过轮次上限，请人工裁决后按结论推进或取消协作卡。',
      proposerType: 'ai_agent',
      proposerId: byMemberId,
      payload: {
        collaborationCardId: row.id,
        rounds: row.rounds,
        ...this.payloadOf(row),
      },
      taskId: row.relatedTaskId ?? undefined,
    });
    this.publish({ ...row, status: 'escalated' }, byMemberId);
  }

  private payloadOf(row: CardRow): Record<string, unknown> {
    return typeof row.payload === 'object' && row.payload !== null
      ? (row.payload as Record<string, unknown>)
      : {};
  }

  /** 流转即事件：对方与相关方据此收到通知/推送 */
  private publish(row: CardRow, byMemberId: string | null): void {
    this.messageBus.publish('collaboration.updated', {
      cardId: row.id,
      projectId: row.projectId,
      status: row.status,
      title: row.title,
      requesterMemberId: row.requesterMemberId,
      providerMemberId: row.providerMemberId,
      byMemberId,
      // 通知受众语义：状态推进的"对方"
      toMemberId:
        byMemberId === row.requesterMemberId
          ? row.providerMemberId
          : row.requesterMemberId,
    });
  }

  private async attachOne(
    row: CardRow,
  ): Promise<CollaborationCardWithNamesDto> {
    const [dto] = await this.attachNames([row]);
    return dto;
  }

  private async attachNames(
    rows: CardRow[],
  ): Promise<CollaborationCardWithNamesDto[]> {
    const memberIds = [
      ...new Set(
        rows.flatMap((r) => [r.requesterMemberId, r.providerMemberId]),
      ),
    ];
    const members = memberIds.length
      ? await this.prisma.member.findMany({
          where: { id: { in: memberIds } },
          select: { id: true, displayName: true },
        })
      : [];
    const nameById = new Map(members.map((m) => [m.id, m.displayName]));
    return rows.map((row) => ({
      id: row.id,
      projectId: row.projectId,
      title: row.title,
      requesterMemberId: row.requesterMemberId,
      providerMemberId: row.providerMemberId,
      ...(row.relatedTaskId ? { relatedTaskId: row.relatedTaskId } : {}),
      payload: this.payloadOf(row),
      status: row.status,
      rounds: row.rounds,
      ...(Array.isArray(row.events)
        ? { events: row.events as CollaborationCardWithNamesDto['events'] }
        : {}),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      requesterName: nameById.get(row.requesterMemberId),
      providerName: nameById.get(row.providerMemberId),
    }));
  }
}
