import { GithubEvidenceSubscriber } from './github-evidence.subscriber';

/**
 * GitHub 事件 → 验收证据回流单测（CAP-B-08 一期 + 二期）：
 * PR 全生命周期（中间态 open / 终态 merged/closed）补 completionEvidence +
 * check_run 落 CI 标准证据（repo 校验）+ pr_review 证据回流。
 */

function buildPrisma() {
  return {
    remotePullRequest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    acceptance: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    acceptanceCriteria: {
      findMany: vi.fn(),
    },
    acceptanceEvidence: {
      findFirst: vi.fn(),
      createMany: vi.fn(),
    },
  };
}

describe('GithubEvidenceSubscriber.onPullRequestUpdated', () => {
  const makeSubscriber = () => {
    const prisma = buildPrisma();
    return { prisma, subscriber: new GithubEvidenceSubscriber(prisma as any) };
  };

  it('merged 终态补全 completionEvidence 并保留已有字段', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'https://github.com/o/r/pull/7',
      number: 7,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'pr',
      status: 'in_review',
      completionEvidence: {
        executionRunId: 'run1',
        artifacts: [{ name: 'a' }],
      },
    });

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });

    expect(prisma.acceptance.update).toHaveBeenCalledTimes(1);
    const arg = prisma.acceptance.update.mock.calls[0][0];
    expect(arg.where.id).toBe('acc1');
    expect(arg.data.completionEvidence.state).toBe('merged');
    expect(arg.data.completionEvidence.prUrl).toBe(
      'https://github.com/o/r/pull/7',
    );
    expect(arg.data.completionEvidence.executionRunId).toBe('run1');
    expect(arg.data.completionEvidence.artifacts).toEqual([{ name: 'a' }]);
    expect(arg.data.completionEvidence.prNumber).toBe(7);
  });

  it('已有 prUrl 时不覆盖', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'https://github.com/o/r/pull/7',
      number: 7,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'pr',
      status: 'in_review',
      completionEvidence: { prUrl: 'https://manual.example/pr/7' },
    });

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });

    expect(
      prisma.acceptance.update.mock.calls[0][0].data.completionEvidence.prUrl,
    ).toBe('https://manual.example/pr/7');
  });

  it('open 中间态回写 completionEvidence（过程可观测）', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'https://github.com/o/r/pull/7',
      number: 7,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'pr',
      status: 'in_review',
      completionEvidence: null,
    });

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'open' });

    expect(prisma.acceptance.update).toHaveBeenCalledTimes(1);
    const arg = prisma.acceptance.update.mock.calls[0][0];
    expect(arg.data.completionEvidence.state).toBe('open');
    expect(arg.data.completionEvidence.prRepo).toBe('o/r');
    expect(arg.data.completionEvidence.prSyncedAt).toBeTruthy();
  });

  it('乱序防御：终态已回写后，迟到的 open 中间态不覆盖', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'https://github.com/o/r/pull/7',
      number: 7,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'pr',
      status: 'in_review',
      completionEvidence: { state: 'merged', prUrl: 'https://x' },
    });

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'open' });

    expect(prisma.acceptance.update).not.toHaveBeenCalled();
  });

  it('未知状态 / 无关联 / 非 pr 契约 均跳过', async () => {
    const { prisma, subscriber } = makeSubscriber();

    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'weird' });
    expect(prisma.remotePullRequest.findUnique).not.toHaveBeenCalled();

    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: null,
    });
    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });
    expect(prisma.acceptance.findUnique).not.toHaveBeenCalled();

    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      htmlUrl: 'u',
      number: 1,
      repoFullName: 'o/r',
    });
    prisma.acceptance.findUnique.mockResolvedValue({
      completionType: 'artifact',
      status: 'in_review',
      completionEvidence: null,
    });
    await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });
    expect(prisma.acceptance.update).not.toHaveBeenCalled();
  });

  // 回归（需求重审 G2，2026-09-17）：守卫曾用旧状态名 accepted/abandoned，
  // 对 schema 现词表（passed/failed/waived）永不命中——已裁决验收的
  // completionEvidence 仍被迟到的 PR 终态事件改写。守卫口径必须与
  // schema 状态词表一致（终态三元组逐一拦截）。
  it.each(['passed', 'failed', 'waived'])(
    '已裁决（%s）验收不回写 completionEvidence——终态守卫回归',
    async (status) => {
      const { prisma, subscriber } = makeSubscriber();
      prisma.remotePullRequest.findUnique.mockResolvedValue({
        acceptanceId: 'acc1',
        htmlUrl: 'https://github.com/o/r/pull/7',
        number: 7,
        repoFullName: 'o/r',
      });
      prisma.acceptance.findUnique.mockResolvedValue({
        completionType: 'pr',
        status,
        completionEvidence: { state: 'open', prUrl: 'https://x' },
      });

      await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });

      expect(prisma.acceptance.update).not.toHaveBeenCalled();
    },
  );

  it.each(['draft', 'pending', 'in_review'])(
    '活跃态（%s）验收仍正常回写（守卫不误伤）',
    async (status) => {
      const { prisma, subscriber } = makeSubscriber();
      prisma.remotePullRequest.findUnique.mockResolvedValue({
        acceptanceId: 'acc1',
        htmlUrl: 'https://github.com/o/r/pull/7',
        number: 7,
        repoFullName: 'o/r',
      });
      prisma.acceptance.findUnique.mockResolvedValue({
        completionType: 'pr',
        status,
        completionEvidence: null,
      });

      await subscriber.onPullRequestUpdated({ id: 'rpr1', state: 'merged' });

      expect(prisma.acceptance.update).toHaveBeenCalledTimes(1);
      expect(prisma.acceptance.update.mock.calls[0][0].where.id).toBe('acc1');
    },
  );
});

describe('GithubEvidenceSubscriber.onCheckRunCompleted', () => {
  const makeSubscriber = () => {
    const prisma = buildPrisma();
    return { prisma, subscriber: new GithubEvidenceSubscriber(prisma as any) };
  };

  it('CI 结论落到 source=ci 的标准并写 metadata', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findFirst.mockResolvedValue({
      acceptanceId: 'acc1',
      number: 7,
    });
    prisma.acceptanceCriteria.findMany.mockResolvedValue([
      { id: 'c1' },
      { id: 'c2' },
    ]);
    prisma.acceptanceEvidence.findFirst.mockResolvedValue(null);

    await subscriber.onCheckRunCompleted({
      branch: 'feat/x',
      checkName: 'quality-gate',
      conclusion: 'success',
      sha: 'abc123',
      htmlUrl: 'https://github.com/o/r/actions/run/1',
      repo: 'o/r',
    });

    expect(prisma.remotePullRequest.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          headBranch: 'feat/x',
          repoFullName: 'o/r',
        }),
      }),
    );
    expect(prisma.acceptanceEvidence.createMany).toHaveBeenCalledTimes(1);
    const arg = prisma.acceptanceEvidence.createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(2);
    expect(arg.data[0].evidenceType).toBe('ci_result');
    expect(arg.data[0].submittedBy).toBe('system:github-checks');
    expect(arg.data[0].metadata.conclusion).toBe('success');
    expect(arg.data[0].content).toBe('quality-gate:success:abc123');
  });

  it('无分支 / 无关联 PR / 无 ci 标准 / 重复投递 均跳过', async () => {
    const { prisma, subscriber } = makeSubscriber();

    await subscriber.onCheckRunCompleted({
      checkName: 'ci',
      conclusion: 'success',
    });
    expect(prisma.remotePullRequest.findFirst).not.toHaveBeenCalled();

    prisma.remotePullRequest.findFirst.mockResolvedValue(null);
    await subscriber.onCheckRunCompleted({
      branch: 'b',
      checkName: 'ci',
      conclusion: 'success',
    });
    expect(prisma.acceptanceCriteria.findMany).not.toHaveBeenCalled();

    prisma.remotePullRequest.findFirst.mockResolvedValue({
      acceptanceId: 'acc1',
      number: 1,
    });
    prisma.acceptanceCriteria.findMany.mockResolvedValue([]);
    await subscriber.onCheckRunCompleted({
      branch: 'b',
      checkName: 'ci',
      conclusion: 'success',
    });
    expect(prisma.acceptanceEvidence.createMany).not.toHaveBeenCalled();

    prisma.acceptanceCriteria.findMany.mockResolvedValue([{ id: 'c1' }]);
    prisma.acceptanceEvidence.findFirst.mockResolvedValue({ id: 'e1' });
    await subscriber.onCheckRunCompleted({
      branch: 'b',
      checkName: 'ci',
      conclusion: 'success',
      sha: 'abc',
    });
    expect(prisma.acceptanceEvidence.createMany).not.toHaveBeenCalled();
  });
});

describe('GithubEvidenceSubscriber.onPullRequestReviewSubmitted', () => {
  const makeSubscriber = () => {
    const prisma = buildPrisma();
    return { prisma, subscriber: new GithubEvidenceSubscriber(prisma as any) };
  };

  it('review 落到 source=pr_review 的标准并按 reviewId 防重', async () => {
    const { prisma, subscriber } = makeSubscriber();
    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      number: 7,
    });
    prisma.acceptanceCriteria.findMany.mockResolvedValue([{ id: 'c9' }]);
    prisma.acceptanceEvidence.findFirst.mockResolvedValue(null);

    await subscriber.onPullRequestReviewSubmitted({
      pullRequestId: 'rpr1',
      repo: 'o/r',
      number: 7,
      reviewId: 'rv1',
      reviewState: 'CHANGES_REQUESTED',
      reviewerLogin: 'alice',
      submittedAt: '2026-09-13T00:00:00Z',
    });

    expect(prisma.acceptanceEvidence.createMany).toHaveBeenCalledTimes(1);
    const arg = prisma.acceptanceEvidence.createMany.mock.calls[0][0];
    expect(arg.data).toHaveLength(1);
    expect(arg.data[0].criteriaId).toBe('c9');
    expect(arg.data[0].evidenceType).toBe('pr_review');
    expect(arg.data[0].submittedBy).toBe('system:github-review');
    expect(arg.data[0].content).toBe('review:rv1:CHANGES_REQUESTED:alice');
    expect(arg.data[0].metadata.reviewerLogin).toBe('alice');

    // 同一 review 重复投递被防重拦截
    prisma.acceptanceEvidence.findFirst.mockResolvedValue({ id: 'e9' });
    await subscriber.onPullRequestReviewSubmitted({
      pullRequestId: 'rpr1',
      reviewId: 'rv1',
      reviewState: 'CHANGES_REQUESTED',
      reviewerLogin: 'alice',
    });
    expect(prisma.acceptanceEvidence.createMany).toHaveBeenCalledTimes(1);
  });

  it('无 PR 关联 / 无 review 标准 均跳过', async () => {
    const { prisma, subscriber } = makeSubscriber();

    prisma.remotePullRequest.findUnique.mockResolvedValue(null);
    await subscriber.onPullRequestReviewSubmitted({
      pullRequestId: 'rpr404',
      reviewState: 'APPROVED',
    });
    expect(prisma.acceptanceCriteria.findMany).not.toHaveBeenCalled();

    prisma.remotePullRequest.findUnique.mockResolvedValue({
      acceptanceId: 'acc1',
      number: 1,
    });
    prisma.acceptanceCriteria.findMany.mockResolvedValue([]);
    await subscriber.onPullRequestReviewSubmitted({
      pullRequestId: 'rpr1',
      reviewState: 'APPROVED',
    });
    expect(prisma.acceptanceEvidence.createMany).not.toHaveBeenCalled();
  });
});
