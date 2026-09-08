import { PlaybookService } from './playbook.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { DocumentService } from '../document/document.service';
import { ProposalService } from '../decision/proposal.service';
import { MemoryService } from '../memory/memory.service';

/** 剧本运行态单测：模板注册表 / 挂载游标 / 访谈→工件+闸门 / 跳过事件 / 状态派生 */

const user = { id: 'u1' };

function buildHarness(opts: {
  project?: Record<string, unknown> | null;
  events?: Array<Record<string, unknown>>;
  gates?: Array<Record<string, unknown>>;
  pendingGate?: Record<string, unknown> | null;
}) {
  const state = {
    project: {
      id: 'p1',
      name: '报销系统',
      playbookRef: null,
      lifecycleStage: null,
      ...(opts.project ?? {}),
    },
    events: [...(opts.events ?? [])],
    createdDocs: [] as Array<Record<string, unknown>>,
    createdProposals: [] as Array<Record<string, unknown>>,
    notedKnowledge: [] as Array<Record<string, unknown>>,
    skippedEvents: [] as Array<Record<string, unknown>>,
  };

  const prisma = {
    project: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        where.id === state.project.id ? { ...state.project } : null,
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          Object.assign(state.project, data);
          return { ...state.project };
        },
      ),
    },
    activity: {
      findMany: jest.fn(async () =>
        Promise.resolve(
          [...state.events].sort(
            (a, b) =>
              new Date(a.createdAt as string).getTime() -
              new Date(b.createdAt as string).getTime(),
          ),
        ),
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        state.skippedEvents.push(data);
        return data;
      }),
    },
    decisionProposal: {
      findFirst: jest.fn(async () => Promise.resolve(opts.pendingGate ?? null)),
      findMany: jest.fn(async () => Promise.resolve(opts.gates ?? [])),
    },
    document: {
      findMany: jest.fn(async () => Promise.resolve([])),
    },
  };

  const documentService = {
    create: jest.fn(async (dto: Record<string, unknown>) => {
      const doc = { id: `doc${state.createdDocs.length + 1}`, ...dto };
      state.createdDocs.push(doc);
      return doc;
    }),
  };
  const proposalService = {
    create: jest.fn(async (dto: Record<string, unknown>) => {
      const proposal = {
        id: `prop${state.createdProposals.length + 1}`,
        ...dto,
      };
      state.createdProposals.push(proposal);
      return proposal;
    }),
  };
  const memoryService = {
    note: jest.fn(async (input: Record<string, unknown>) => {
      state.notedKnowledge.push(input);
      return input;
    }),
  };

  const service = new PlaybookService(
    prisma as unknown as PrismaService,
    documentService as unknown as DocumentService,
    proposalService as unknown as ProposalService,
    memoryService as unknown as MemoryService,
  );

  return {
    service,
    state,
    prisma,
    documentService,
    proposalService,
    memoryService,
  };
}

describe('PlaybookService', () => {
  describe('getTemplates', () => {
    it('返回内置模板（全流程 6 阶段 + 维护型 3 阶段），访谈带术语对照', () => {
      const { service } = buildHarness({ project: null });
      const { version, templates } = service.getTemplates();
      expect(version).toBe('1');
      expect(templates.map((t) => t.key)).toEqual([
        'software-full-cycle',
        'maintenance-light',
      ]);
      const research = templates[0].stages.find((s) => s.key === 'research');
      expect(research?.interview.length).toBeGreaterThan(0);
      expect(research?.interview[0].term).toBeTruthy();
      expect(research?.interview.every((q) => q.required)).toBe(true);
    });
  });

  describe('mount', () => {
    it('未知模板抛 NotFound', async () => {
      const { service } = buildHarness({ project: {} });
      await expect(
        service.mount('p1', { playbookRef: 'nope' }, user.id),
      ).rejects.toThrow(NotFoundException);
    });

    it('挂载后游标拨到首阶段并记录事件', async () => {
      const { service, state } = buildHarness({ project: {} });
      const status = await service.mount(
        'p1',
        { playbookRef: 'software-full-cycle' },
        user.id,
      );
      expect(state.project.playbookRef).toBe('software-full-cycle');
      expect(state.project.lifecycleStage).toBe('research');
      expect(state.skippedEvents[0]?.type).toBe('playbook_mounted');
      expect(status.stages[0]).toMatchObject({
        key: 'research',
        status: 'active',
      });
      expect(status.stages[1]).toMatchObject({
        key: 'requirements',
        status: 'pending',
      });
    });
  });

  describe('submitInterview', () => {
    const mounted = {
      playbookRef: 'software-full-cycle',
      lifecycleStage: 'research',
    };

    it('未挂载剧本拒绝', async () => {
      const { service } = buildHarness({ project: {} });
      await expect(
        service.submitInterview('p1', 'research', { answers: [] }, user.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('游标不在该阶段拒绝', async () => {
      const { service } = buildHarness({ project: mounted });
      await expect(
        service.submitInterview('p1', 'requirements', { answers: [] }, user.id),
      ).rejects.toThrow(/当前游标/);
    });

    it('必答问题未回答拒绝', async () => {
      const { service } = buildHarness({ project: mounted });
      await expect(
        service.submitInterview(
          'p1',
          'research',
          { answers: [{ questionId: 'who', answer: '行政同事' }] },
          user.id,
        ),
      ).rejects.toThrow(/必答问题/);
    });

    it('已有同阶段待拍板闸门拒绝（幂等去重）', async () => {
      const { service } = buildHarness({
        project: mounted,
        pendingGate: {
          id: 'gate-old',
          payload: {
            type: 'playbook_gate',
            templateKey: 'software-full-cycle',
            stage: 'research',
          },
        },
      });
      await expect(
        service.submitInterview(
          'p1',
          'research',
          { answers: [{ questionId: 'who', answer: '行政同事' }] },
          user.id,
        ),
      ).rejects.toThrow(/待拍板的闸门/);
    });

    it('访谈转写成工件 + 术语对照 + 闸门提案 + 知识原子落 Store B', async () => {
      const { service, state } = buildHarness({ project: mounted });
      const result = await service.submitInterview(
        'p1',
        'research',
        {
          answers: [
            {
              questionId: 'who',
              answer: '我们公司内部的行政同事，每天要处理报销单',
            },
            {
              questionId: 'pain',
              answer: '报销单要贴发票找领导签字，经常弄丢',
            },
            { questionId: 'success', answer: '报销从 3 天缩短到半天' },
            { questionId: 'scope', answer: '不做手机端' },
          ],
        },
        user.id,
      );

      expect(result.documentId).toBe('doc1');
      expect(result.proposalId).toBe('prop1');
      expect(result.mappings.length).toBeGreaterThan(0);
      expect(result.mappings[0]).toMatchObject({ term: '目标用户画像' });

      const doc = state.createdDocs[0];
      expect(doc.title).toBe('调研纪要 · 报销系统');
      expect(String(doc.content)).toContain('人话对照');
      expect(String(doc.content)).toContain('目标用户画像');

      const proposal = state.createdProposals[0];
      expect(proposal.kind).toBe('gate');
      const payload = proposal.payload as Record<string, unknown>;
      expect(payload.type).toBe('playbook_gate');
      expect(payload.stage).toBe('research');
      expect(payload.documentId).toBe('doc1');
      expect(Array.isArray(payload.consequences)).toBe(true);
      expect((payload.knowledge as unknown[]).length).toBeGreaterThan(0);

      expect(state.notedKnowledge.length).toBeGreaterThan(0);
      expect(state.notedKnowledge[0]).toMatchObject({ type: 'knowledge' });
      expect(String(state.notedKnowledge[0].content)).toContain(
        '【目标用户画像】',
      );
    });
  });

  describe('skipStage', () => {
    it('跳过记事件并推进游标；原因留痕', async () => {
      const { service, state } = buildHarness({
        project: {
          playbookRef: 'software-full-cycle',
          lifecycleStage: 'research',
        },
      });
      const result = await service.skipStage(
        'p1',
        'research',
        { reason: '需求足够简单' },
        user.id,
      );
      expect(result).toEqual({
        skippedStage: 'research',
        currentStage: 'requirements',
      });
      expect(state.project.lifecycleStage).toBe('requirements');
      expect(state.skippedEvents[0]).toMatchObject({
        type: 'playbook_stage_skipped',
        metadata: expect.objectContaining({
          stage: 'research',
          reason: '需求足够简单',
        }),
      });
    });
  });

  describe('getStatus 派生', () => {
    it('未挂载：playbookRef 为 null、stages 为空', async () => {
      const { service } = buildHarness({ project: {} });
      const status = await service.getStatus('p1');
      expect(status.playbookRef).toBeNull();
      expect(status.stages).toEqual([]);
    });

    it('完成/跳过/待拍板闸门按事件与提案派生状态', async () => {
      const { service } = buildHarness({
        project: {
          playbookRef: 'software-full-cycle',
          lifecycleStage: 'design',
        },
        events: [
          {
            type: 'playbook_stage_completed',
            metadata: { stage: 'research' },
            createdAt: new Date('2026-09-07T01:00:00Z'),
          },
          {
            type: 'playbook_stage_skipped',
            metadata: { stage: 'requirements', reason: '简单项目' },
            createdAt: new Date('2026-09-07T02:00:00Z'),
          },
        ],
        gates: [
          {
            id: 'gate-pending',
            status: 'pending',
            payload: {
              type: 'playbook_gate',
              templateKey: 'software-full-cycle',
              stage: 'design',
            },
          },
        ],
      });
      const status = await service.getStatus('p1');
      const byKey = Object.fromEntries(status.stages.map((s) => [s.key, s]));
      expect(byKey.research.status).toBe('done');
      expect(byKey.research.completedAt).toBeTruthy();
      expect(byKey.requirements.status).toBe('skipped');
      expect(byKey.requirements.skippedReason).toBe('简单项目');
      expect(byKey.design.status).toBe('active');
      expect(byKey.design.gateProposalId).toBe('gate-pending');
      expect(status.currentStage).toBe('design');
    });
  });
});
