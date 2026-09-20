import { NotFoundException } from '@nestjs/common';
import {
  extractAnswer,
  extractImpact,
  RevisionImpactService,
  REVISION_IMPACT_CHOICE_MARK,
} from './revision-impact.service';
import { RevisionImpactSubscriber } from './revision-impact.subscriber';

/**
 * 需求修订影响链路单测（CAP-P-01 批一 P0 最小闭环）：
 * 修订触发 → 影响清单 → 决策卡创建 → 确认 → 标准置待复核。
 */

function makePrisma(overrides: Record<string, unknown> = {}) {
  const store = {
    document: {
      findFirst: vi.fn(async () => ({
        id: 'doc-1',
        title: '需求文档',
        category: 'requirement',
        projectId: 'proj-1',
        content: '# 需求',
      })),
    },
    documentTaskLink: {
      findMany: vi.fn(async () => [
        { issueId: 'issue-1', linkType: 'references', sectionId: null },
        { issueId: 'issue-2', linkType: 'implements', sectionId: 'sec-9' },
      ]),
    },
    issue: {
      findMany: vi.fn(async () => [
        { id: 'issue-1', title: '任务一' },
        { id: 'issue-2', title: '任务二' },
      ]),
    },
    acceptance: {
      findMany: vi.fn(async () => [
        { id: 'acc-1', issueId: 'issue-1' },
        { id: 'acc-2', issueId: 'issue-2' },
      ]),
    },
    acceptanceCriteria: {
      findMany: vi.fn(async () => [
        {
          id: 'cri-1',
          content: '标准一',
          status: 'pending',
          acceptance: { issueId: 'issue-1' },
        },
        {
          id: 'cri-2',
          content: '标准二',
          status: 'in_review',
          acceptance: { issueId: 'issue-2' },
        },
      ]),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    decisionProposal: {
      findMany: vi.fn(async () => []),
    },
    ...overrides,
  };
  return store;
}

function makeService(prisma: Record<string, any>) {
  const proposalService = {
    create: vi.fn(async (dto: unknown) => ({
      id: 'prop-1',
      ...(dto as object),
    })),
  };
  const svc = new RevisionImpactService(
    prisma as never,
    proposalService as never,
  );
  return { svc, proposalService };
}

/** 决策卡查询按 where.status 分发（服务按 kind+status 查询后内存过滤） */
function proposalFindMany(byStatus: {
  pending?: unknown[];
  accepted?: unknown[];
  rejected?: unknown[];
}) {
  return vi.fn(
    async (args: { where: { status: string } }) =>
      (byStatus as Record<string, unknown[]>)[args.where.status] ?? [],
  );
}

describe('RevisionImpactService.analyze', () => {
  it('需求类文档 + 关联任务与活跃标准 → 创建 clarify 决策卡并带结构化影响清单', async () => {
    const prisma = makePrisma();
    const { svc, proposalService } = makeService(prisma);

    const result = await svc.analyze('doc-1');

    expect(result.status).toBe('created');
    expect(result.proposalId).toBe('prop-1');
    expect(result.issueCount).toBe(2);
    expect(result.criteriaCount).toBe(2);
    expect(proposalService.create).toHaveBeenCalledTimes(1);
    const dto = proposalService.create.mock.calls[0][0] as {
      kind: string;
      title: string;
      payload: {
        question: string;
        revisionImpact: { documentId: string; criteriaIds: string[] };
        choices: Array<{ key: string; guess?: boolean }>;
      };
      projectId?: string;
      proposerType?: string;
    };
    expect(dto.kind).toBe('clarify');
    expect(dto.title).toContain('需求文档');
    expect(dto.projectId).toBe('proj-1');
    expect(dto.proposerType).toBe('system');
    expect(dto.payload.revisionImpact.documentId).toBe('doc-1');
    expect(dto.payload.revisionImpact.criteriaIds).toEqual(['cri-1', 'cri-2']);
    // 选项：首项为「标记待复核」且是 AI 推荐位
    expect(dto.payload.choices[0].key).toBe(REVISION_IMPACT_CHOICE_MARK);
    expect(dto.payload.choices[0].guess).toBe(true);
  });

  it('非需求类文档 → not_applicable 不建卡', async () => {
    const prisma = makePrisma({
      document: {
        findFirst: vi.fn(async () => ({
          id: 'doc-1',
          title: '会议纪要',
          category: 'custom',
          projectId: null,
          content: 'x',
        })),
      },
    });
    const { svc, proposalService } = makeService(prisma);
    const result = await svc.analyze('doc-1');
    expect(result.status).toBe('not_applicable');
    expect(proposalService.create).not.toHaveBeenCalled();
  });

  it('无关联任务 → not_applicable 不建卡', async () => {
    const prisma = makePrisma({
      documentTaskLink: { findMany: vi.fn(async () => []) },
    });
    const { svc, proposalService } = makeService(prisma);
    const result = await svc.analyze('doc-1');
    expect(result.status).toBe('not_applicable');
    expect(proposalService.create).not.toHaveBeenCalled();
  });

  it('关联任务但全部标准非活跃（passed/waived）→ not_applicable（不误报）', async () => {
    const prisma = makePrisma({
      acceptanceCriteria: {
        findMany: vi.fn(async () => []),
        updateMany: vi.fn(),
      },
    });
    const { svc, proposalService } = makeService(prisma);
    const result = await svc.analyze('doc-1');
    expect(result.status).toBe('not_applicable');
    expect(proposalService.create).not.toHaveBeenCalled();
  });

  it('已存在同文档待决卡 → skipped 不重复建卡', async () => {
    const prisma = makePrisma({
      decisionProposal: {
        findMany: proposalFindMany({
          pending: [
            {
              id: 'prop-old',
              status: 'pending',
              resolution: null,
              createdAt: new Date(),
              payload: {
                question: 'q',
                revisionImpact: { documentId: 'doc-1', criteriaIds: ['cri-1'] },
                choices: [],
              },
            },
          ],
        }),
      },
    });
    const { svc, proposalService } = makeService(prisma);
    const result = await svc.analyze('doc-1');
    expect(result.status).toBe('skipped');
    expect(result.proposalId).toBe('prop-old');
    expect(proposalService.create).not.toHaveBeenCalled();
  });

  it('文档不存在 → 404', async () => {
    const prisma = makePrisma({
      document: { findFirst: vi.fn(async () => null) },
    });
    const { svc } = makeService(prisma);
    await expect(svc.analyze('doc-x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('analyzeOnUpdate 失败降级为告警不外抛（旁路语义）', async () => {
    const prisma = makePrisma({
      document: {
        findFirst: vi.fn(async () => {
          throw new Error('db down');
        }),
      },
    });
    const { svc } = makeService(prisma);
    await expect(svc.analyzeOnUpdate('doc-1')).resolves.toBeUndefined();
  });
});

describe('RevisionImpactService.getStatus（确认后动作收敛）', () => {
  it('无卡 → none', async () => {
    const prisma = makePrisma();
    const { svc } = makeService(prisma);
    const result = await svc.getStatus('doc-1');
    expect(result.status).toBe('none');
    expect(prisma.acceptanceCriteria.updateMany).not.toHaveBeenCalled();
  });

  it('待决卡 → pending_decision 不动标准', async () => {
    const prisma = makePrisma({
      decisionProposal: {
        findMany: proposalFindMany({
          pending: [
            {
              id: 'prop-1',
              status: 'pending',
              resolution: null,
              createdAt: new Date(),
              payload: {
                revisionImpact: {
                  documentId: 'doc-1',
                  criteriaIds: ['cri-1', 'cri-2'],
                  issues: [{ issueId: 'issue-1' }],
                  analyzedAt: '2026-09-18T00:00:00.000Z',
                },
              },
            },
          ],
        }),
      },
    });
    const { svc } = makeService(prisma);
    const result = await svc.getStatus('doc-1');
    expect(result.status).toBe('pending_decision');
    expect(result.proposalId).toBe('prop-1');
    expect(result.criteriaCount).toBe(2);
    expect(prisma.acceptanceCriteria.updateMany).not.toHaveBeenCalled();
  });

  it('已确认 mark_pending → 幂等应用：活跃标准（draft/in_review）置 pending', async () => {
    const prisma = makePrisma({
      decisionProposal: {
        findMany: proposalFindMany({
          accepted: [
            {
              id: 'prop-1',
              status: 'accepted',
              resolution: {
                action: 'accept',
                answer: REVISION_IMPACT_CHOICE_MARK,
              },
              createdAt: new Date(),
              payload: {
                revisionImpact: {
                  documentId: 'doc-1',
                  criteriaIds: ['cri-1', 'cri-2'],
                  issues: [],
                  analyzedAt: '2026-09-18T00:00:00.000Z',
                },
              },
            },
          ],
        }),
      },
    });
    const { svc } = makeService(prisma);
    const result = await svc.getStatus('doc-1');
    expect(result.status).toBe('applied');
    expect(result.appliedCount).toBe(1);
    expect(prisma.acceptanceCriteria.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['cri-1', 'cri-2'] },
        status: { in: ['draft', 'in_review'] },
      },
      data: { status: 'pending' },
    });
  });

  it('已确认 dismiss（知悉不处理）→ dismissed 不动标准', async () => {
    const prisma = makePrisma({
      decisionProposal: {
        findMany: proposalFindMany({
          accepted: [
            {
              id: 'prop-1',
              status: 'accepted',
              resolution: { action: 'accept', answer: 'dismiss' },
              createdAt: new Date(),
              payload: {
                revisionImpact: {
                  documentId: 'doc-1',
                  criteriaIds: ['cri-1'],
                  issues: [],
                  analyzedAt: '2026-09-18T00:00:00.000Z',
                },
              },
            },
          ],
        }),
      },
    });
    const { svc } = makeService(prisma);
    const result = await svc.getStatus('doc-1');
    expect(result.status).toBe('dismissed');
    expect(prisma.acceptanceCriteria.updateMany).not.toHaveBeenCalled();
  });

  it('卡被 reject → dismissed 不动标准', async () => {
    const prisma = makePrisma({
      decisionProposal: {
        findMany: proposalFindMany({
          rejected: [
            {
              id: 'prop-1',
              status: 'rejected',
              resolution: { action: 'reject', reason: '不改' },
              createdAt: new Date(),
              payload: {
                revisionImpact: {
                  documentId: 'doc-1',
                  criteriaIds: ['cri-1'],
                  issues: [],
                  analyzedAt: '2026-09-18T00:00:00.000Z',
                },
              },
            },
          ],
        }),
      },
    });
    const { svc } = makeService(prisma);
    const result = await svc.getStatus('doc-1');
    expect(result.status).toBe('dismissed');
    expect(prisma.acceptanceCriteria.updateMany).not.toHaveBeenCalled();
  });

  it('非需求类文档 → none（不查卡）', async () => {
    const prisma = makePrisma({
      document: {
        findFirst: vi.fn(async () => ({ id: 'doc-1', category: 'guide' })),
      },
    });
    const { svc } = makeService(prisma);
    const result = await svc.getStatus('doc-1');
    expect(result.status).toBe('none');
    expect(prisma.decisionProposal.findMany).not.toHaveBeenCalled();
  });
});

describe('RevisionImpactSubscriber', () => {
  function makeSubscriber(analyze: ReturnType<typeof vi.fn>) {
    const handlers = new Map<string, (p: unknown) => void>();
    const messageBus = {
      subscribe: vi.fn((type: string, handler: (p: unknown) => void) => {
        handlers.set(type, handler);
        return () => undefined;
      }),
    };
    const service = { analyzeOnUpdate: analyze };
    const subscriber = new RevisionImpactSubscriber(
      messageBus as never,
      service as never,
    );
    return { subscriber, handlers };
  }

  it('document.updated 且 contentChanged → 触发影响分析', async () => {
    const analyze = vi.fn(async () => undefined);
    const { handlers } = makeSubscriber(analyze);
    const handler = handlers.get('document.updated')!;
    await handler({ documentId: 'doc-1', contentChanged: true });
    expect(analyze).toHaveBeenCalledWith('doc-1');
  });

  it('content 未变（仅标题/状态）→ 不触发', async () => {
    const analyze = vi.fn(async () => undefined);
    const { handlers } = makeSubscriber(analyze);
    const handler = handlers.get('document.updated')!;
    await handler({ documentId: 'doc-1', contentChanged: false });
    await handler({ documentId: 'doc-1' });
    await handler({});
    expect(analyze).not.toHaveBeenCalled();
  });

  it('分析异常不外抛（旁路降级）', async () => {
    const analyze = vi.fn(async () => {
      throw new Error('boom');
    });
    const { handlers } = makeSubscriber(analyze);
    const handler = handlers.get('document.updated')!;
    await expect(
      handler({ documentId: 'doc-1', contentChanged: true }),
    ).resolves.toBeUndefined();
  });
});

describe('payload/resolution 提取工具', () => {
  it('extractImpact 结构不符返回 null', () => {
    expect(extractImpact(null)).toBeNull();
    expect(extractImpact({})).toBeNull();
    expect(extractImpact({ revisionImpact: { documentId: 'd' } })).toBeNull();
    expect(
      extractImpact({
        revisionImpact: { documentId: 'd', criteriaIds: ['c1'] },
      }),
    ).toMatchObject({ documentId: 'd' });
  });

  it('extractAnswer 非 string 返回 undefined', () => {
    expect(extractAnswer(null)).toBeUndefined();
    expect(extractAnswer({ answer: 1 })).toBeUndefined();
    expect(extractAnswer({ answer: 'mark_pending' })).toBe('mark_pending');
  });
});
