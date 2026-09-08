import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { DocumentService } from '../document/document.service';
import { ProposalService } from '../decision/proposal.service';
import { MemoryService } from '../memory/memory.service';
import { CreateDocumentDto } from '../document/dto/create-document.dto';
import { CreateProposalDto } from '../decision/dto/proposal.dto';
import {
  BUILTIN_PLAYBOOKS,
  PLAYBOOK_REGISTRY_VERSION,
  firstStageKey,
  getPlaybookTemplate,
  getStage,
  nextStageKey,
  stageKnowledge,
} from './playbook.registry';
import { buildInterviewDocument } from './playbook-document.builder';
import {
  GATE_PLAYBOOK_TYPE,
  GlossaryMappingDto,
  MountPlaybookDto,
  PLAYBOOK_EVENT_TYPES,
  PlaybookGatePayload,
  PlaybookStageStatusDto,
  PlaybookStatusResponseDto,
  PlaybookTemplatesResponseDto,
  SkipStageDto,
  SkipStageResponseDto,
  SubmitInterviewDto,
  SubmitInterviewResponseDto,
} from './dto/playbook.dto';

/**
 * 剧本运行态（v2 纪要 §3.4 / §4.2）：
 * 流程状态是「游标」不是「牢笼」——阶段可跳过（记事件）、闸门在决策收件箱拍板、
 * 本模块不开第二个拍板入口。模板 = 代码内置注册表（版本化），实例 = Project 两个可空字段
 * + 活动事件派生时间线，零新增实体族。
 */
@Injectable()
export class PlaybookService {
  private readonly logger = new Logger(PlaybookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly proposalService: ProposalService,
    private readonly memoryService: MemoryService,
  ) {}

  /** 内置剧本模板（只读；工作区自定义模板后置切片） */
  getTemplates(): PlaybookTemplatesResponseDto {
    return {
      version: PLAYBOOK_REGISTRY_VERSION,
      templates: BUILTIN_PLAYBOOKS.map((t) => ({
        key: t.key,
        name: t.name,
        description: t.description,
        audience: t.audience,
        stages: t.stages.map((s) => ({
          key: s.key,
          name: s.name,
          purpose: s.purpose,
          domain: s.domain,
          interview: s.interview.map((q) => ({
            id: q.id,
            question: q.question,
            hint: q.hint,
            required: q.required ?? true,
            term: q.term,
            termNote: q.termNote,
          })),
          document: s.document as unknown as Record<string, unknown>,
          gate: s.gate as unknown as Record<string, unknown>,
        })),
      })),
    };
  }

  /** 项目剧本运行态：游标 + 阶段时间线（事件派生）+ 闸门提案状态 */
  async getStatus(projectId: string): Promise<PlaybookStatusResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`项目 ${projectId} 不存在`);

    const template = project.playbookRef
      ? getPlaybookTemplate(project.playbookRef)
      : null;
    if (!template) {
      return {
        projectId,
        playbookRef: project.playbookRef ?? null,
        template: null,
        currentStage: project.lifecycleStage ?? null,
        stages: [],
      };
    }

    const [events, gates] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          projectId,
          type: { in: [...PLAYBOOK_EVENT_TYPES] },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.decisionProposal.findMany({
        where: { projectId, kind: 'gate' },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const gatePayloads = gates
      .map((g) => ({
        id: g.id,
        status: g.status,
        payload: g.payload as unknown as PlaybookGatePayload,
      }))
      .filter((g) => g.payload?.type === GATE_PLAYBOOK_TYPE);

    const documentIds = new Set<string>();
    for (const g of gatePayloads) {
      if (g.payload.documentId) documentIds.add(g.payload.documentId);
    }
    const documents = await this.prisma.document.findMany({
      where: { id: { in: [...documentIds] } },
      select: { id: true, title: true },
    });
    const docTitles = new Map(documents.map((d) => [d.id, d.title]));

    const stages: PlaybookStageStatusDto[] = template.stages.map((stage) => {
      const stageGates = gatePayloads.filter(
        (g) => g.payload.stage === stage.key,
      );
      const pendingGate = stageGates.find((g) => g.status === 'pending');
      const acceptedGate = stageGates.find((g) => g.status === 'accepted');
      const rejectedCount = stageGates.filter(
        (g) => g.status === 'rejected',
      ).length;

      const completedEvent = [...events]
        .reverse()
        .find(
          (e) =>
            e.type === 'playbook_stage_completed' &&
            e.metadata &&
            (e.metadata as { stage?: string }).stage === stage.key,
        );
      const skippedEvent = [...events]
        .reverse()
        .find(
          (e) =>
            e.type === 'playbook_stage_skipped' &&
            e.metadata &&
            (e.metadata as { stage?: string }).stage === stage.key,
        );

      let status: PlaybookStageStatusDto['status'] = 'pending';
      if (completedEvent) status = 'done';
      else if (skippedEvent) status = 'skipped';
      else if (pendingGate || project.lifecycleStage === stage.key)
        status = 'active';

      const documentId =
        (acceptedGate?.payload.documentId as string | undefined) ??
        (completedEvent?.metadata as { documentId?: string } | undefined)
          ?.documentId;

      return {
        key: stage.key,
        name: stage.name,
        purpose: stage.purpose,
        status,
        ...(completedEvent
          ? { completedAt: completedEvent.createdAt.toISOString() }
          : {}),
        ...(skippedEvent
          ? {
              skippedAt: skippedEvent.createdAt.toISOString(),
              skippedReason: (
                skippedEvent.metadata as { reason?: string } | undefined
              )?.reason,
            }
          : {}),
        ...(documentId
          ? { documentId, documentTitle: docTitles.get(documentId) }
          : {}),
        ...(pendingGate
          ? { gateProposalId: pendingGate.id, gateStatus: 'pending' as const }
          : acceptedGate
            ? {
                gateProposalId: acceptedGate.id,
                gateStatus: 'accepted' as const,
              }
            : stageGates[0]
              ? {
                  gateProposalId: stageGates[0].id,
                  gateStatus: 'rejected' as const,
                }
              : {}),
        gateRejections: rejectedCount,
      };
    });

    return {
      projectId,
      playbookRef: project.playbookRef ?? null,
      template: {
        key: template.key,
        name: template.name,
        description: template.description,
      },
      currentStage: project.lifecycleStage ?? null,
      stages,
    };
  }

  /** 挂载剧本：设置 playbookRef + 游标拨到首阶段（重挂 = 换模板，游标重置） */
  async mount(
    projectId: string,
    dto: MountPlaybookDto,
    userId: string,
  ): Promise<PlaybookStatusResponseDto> {
    const template = getPlaybookTemplate(dto.playbookRef);
    if (!template) {
      throw new NotFoundException(`未知剧本模板：${dto.playbookRef}`);
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`项目 ${projectId} 不存在`);

    const first = firstStageKey(template.key);
    await this.prisma.project.update({
      where: { id: projectId },
      data: { playbookRef: template.key, lifecycleStage: first },
    });
    await this.recordEvent(projectId, 'playbook_mounted', {
      templateKey: template.key,
      stage: first,
      actor: userId,
    });
    return this.getStatus(projectId);
  }

  /**
   * 提交阶段访谈：确定性转写成正式工件（对照翻译）+ 建闸门决策卡。
   * 闸门在决策收件箱拍板——本模块不落第二个审批入口（v2 纪要 §4.2）。
   */
  async submitInterview(
    projectId: string,
    stageKey: string,
    dto: SubmitInterviewDto,
    userId: string,
  ): Promise<SubmitInterviewResponseDto> {
    const { project, template, stage } = await this.assertActiveStage(
      projectId,
      stageKey,
    );

    const pending = await this.prisma.decisionProposal.findFirst({
      where: { projectId, kind: 'gate', status: 'pending' },
    });
    if (pending) {
      const payload = pending.payload as unknown as PlaybookGatePayload;
      if (payload?.type === GATE_PLAYBOOK_TYPE && payload.stage === stageKey) {
        throw new BadRequestException(
          '该阶段已有待拍板的闸门，请先到决策收件箱处理',
        );
      }
    }

    const answerIds = new Set(dto.answers.map((a) => a.questionId));
    const missing = stage.interview
      .filter((q) => q.required !== false && !answerIds.has(q.id))
      .map((q) => q.question);
    if (missing.length > 0) {
      throw new BadRequestException(`必答问题未回答：${missing.join('；')}`);
    }

    const doc = buildInterviewDocument({
      projectName: project.name,
      stage,
      answers: dto.answers,
    });
    const createdDoc = await this.documentService.create(
      {
        title: doc.title,
        content: doc.content,
        projectId,
        category: stage.document.category,
        summary: stage.purpose,
      } as CreateDocumentDto,
      userId,
    );

    // 知识原子落 Store B（v2 纪要 §2.2）：决策卡与文档只引用，解释内容唯一真源在记忆库。
    // 内置课程知识高置信；重复访谈去重提置信而非重复插入。旁路失败不阻断工件产出。
    try {
      const knowledge = stageKnowledge(stage);
      await Promise.all(
        knowledge.map((k) =>
          this.memoryService.note({
            projectId,
            type: 'knowledge',
            content: `【${k.term}】${k.note}`,
            confidence: 1,
            refs: [
              { kind: 'domain', id: stage.domain },
              { kind: 'question', id: k.questionId },
            ],
            sourceType: 'tool',
            sourceEventId: createdDoc.id,
            createdBy: userId,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(
        `knowledge atoms note failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const proposal = await this.proposalService.create(
      {
        kind: 'gate',
        projectId,
        title: stage.gate.title,
        detail: stage.gate.detail,
        proposerType: 'system',
        payload: {
          type: GATE_PLAYBOOK_TYPE,
          templateKey: template.key,
          stage: stageKey,
          domain: stage.domain,
          documentId: createdDoc.id,
          documentTitle: doc.title,
          mappings: doc.mappings,
          knowledge: stageKnowledge(stage),
          consequences: stage.gate.consequences,
        } as unknown as Record<string, unknown>,
      } as CreateProposalDto,
      userId,
    );

    return {
      documentId: createdDoc.id,
      documentTitle: doc.title,
      proposalId: proposal.id,
      mappings: doc.mappings as GlossaryMappingDto[],
    };
  }

  /** 跳过阶段：放行但记事件（后面验收出问题时 AI 有据可查地提醒） */
  async skipStage(
    projectId: string,
    stageKey: string,
    dto: SkipStageDto,
    userId: string,
  ): Promise<SkipStageResponseDto> {
    await this.assertActiveStage(projectId, stageKey);
    const next = nextStageKey(
      (await this.prisma.project.findUnique({ where: { id: projectId } }))
        ?.playbookRef ?? '',
      stageKey,
    );
    await this.prisma.project.update({
      where: { id: projectId },
      data: { lifecycleStage: next },
    });
    await this.recordEvent(projectId, 'playbook_stage_skipped', {
      stage: stageKey,
      reason: dto.reason,
      actor: userId,
    });
    return { skippedStage: stageKey, currentStage: next };
  }

  // ─── 内部 ───

  /** 校验：项目存在 + 已挂剧本 + 游标停在该阶段 */
  private async assertActiveStage(projectId: string, stageKey: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException(`项目 ${projectId} 不存在`);
    const template = project.playbookRef
      ? getPlaybookTemplate(project.playbookRef)
      : null;
    if (!template || !project.lifecycleStage) {
      throw new BadRequestException('项目未挂载剧本，请先在流程页选择剧本');
    }
    const stage = getStage(template.key, stageKey);
    if (!stage)
      throw new NotFoundException(`剧本 ${template.key} 无阶段 ${stageKey}`);
    if (project.lifecycleStage !== stageKey) {
      throw new BadRequestException(
        `当前游标在「${project.lifecycleStage}」，只能操作当前阶段`,
      );
    }
    return { project, template, stage };
  }

  /** 剧本事件进活动流（旁路：失败不影响主流程） */
  private async recordEvent(
    projectId: string,
    type: (typeof PLAYBOOK_EVENT_TYPES)[number],
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      await this.prisma.activity.create({
        data: {
          entityType: 'project',
          entityId: projectId,
          projectId,
          actorId:
            typeof metadata.actor === 'string'
              ? (metadata.actor as string)
              : null,
          type,
          summary: PLAYBOOK_EVENT_SUMMARY[type](metadata),
          source: 'system',
          metadata: metadata as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      this.logger.warn(
        `playbook activity record failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}

const PLAYBOOK_EVENT_SUMMARY: Record<
  (typeof PLAYBOOK_EVENT_TYPES)[number],
  (meta: Record<string, unknown>) => string
> = {
  playbook_mounted: (m) => `挂载剧本「${m.templateKey}」，游标拨到 ${m.stage}`,
  playbook_stage_completed: (m) => `阶段「${m.stage}」通过闸门`,
  playbook_stage_skipped: (m) =>
    `跳过阶段「${m.stage}」${m.reason ? `：${m.reason}` : ''}`,
  playbook_gate_rejected: (m) =>
    `阶段「${m.stage}」闸门被驳回${m.reason ? `：${m.reason}` : ''}`,
};
