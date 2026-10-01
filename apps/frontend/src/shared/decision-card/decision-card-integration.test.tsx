import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DecisionCard } from './decision-card';
import type { Decision } from './types';

// i18n mock 仅透传键名，断言直接对着键写（backups-section.test.tsx 同款）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const integrationDecision: Decision = {
  id: 'integration:prop1',
  kind: 'integration',
  sourceId: 'prop1',
  status: 'pending',
  title: 'AI 执行完成：3 个文件 +12 −2，建议合入',
  detail:
    '分支 apm/exec/abcd1234（基于 base12345）共 2 个提交。合入将对主工作区执行 git merge --no-ff。',
  urgency: 'advisory',
  projectId: 'p1',
  projectName: 'APM',
  issueId: 'issue-1',
  taskTitle: '实现登录页',
  proposer: { type: 'system' },
  payload: {
    executionId: 'exec_abcd1234',
    issueId: 'issue-1',
    projectRoot: 'E:\\repo',
    worktreePath: 'E:\\repo\\.apm\\worktrees\\abcd1234',
    branch: 'apm/exec/abcd1234',
    baseRef: 'base1234567890',
    headRef: 'head1234567890',
    diffStat: ' 3 files changed, 12 insertions(+), 2 deletions(-)',
    insertions: 12,
    deletions: 2,
    files: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
    filesTotal: 25,
    commitCount: 2,
    mainDirty: ['M notes.md'],
    taskTitle: '实现登录页',
  },
  createdAt: new Date().toISOString(),
};

function renderCard(decision: Decision = integrationDecision) {
  const onAction = vi.fn();
  const { container } = render(
    <DecisionCard decision={decision} onAction={onAction} />,
  );
  const ai = (id: string) =>
    container.querySelector(`[data-ai="${id}"]`) as HTMLElement;
  return { onAction, ai };
}

describe('DecisionCard integration（G5-b 成果合入卡 · A-18 两层样板）', () => {
  it('默认层：结论摘要（工单标题/分支/推荐语/影响行）可见，动作栏=合入+驳回', () => {
    const { onAction } = renderCard();

    // 结论行：来自工单 + 隔离分支短名（分支短名同时出现在 detail 里，取全部）
    expect(screen.getByText('实现登录页')).toBeTruthy();
    expect(
      screen.getAllByText(/apm\/exec\/abcd1234/).length,
    ).toBeGreaterThan(0);
    // 推荐语
    expect(screen.getByText('decision.integration.recommend')).toBeTruthy();
    // 影响行：文件数 / 增删 / 提交数
    expect(screen.getByText('decision.integration.impactFiles')).toBeTruthy();
    expect(screen.getByText('+12 −2')).toBeTruthy();
    // 脏工作区警示默认可见（卡创建时已预检到）
    expect(screen.getByText('decision.integration.dirtyWarning')).toBeTruthy();
    // 动作栏：合入（accept 直送）+ 驳回（mock 透传键名，按钮名=键）
    fireEvent.click(
      screen.getByRole('button', { name: /decision\.action\.merge/ }),
    );
    expect(onAction).toHaveBeenCalledWith('accept', integrationDecision);
    expect(
      screen.getByRole('button', { name: /decision\.action\.reject/ }),
    ).toBeTruthy();
  });

  it('可展开层：默认折叠，展开后文件清单/溢出计数/分支溯源/合入语义可见', () => {
    const { ai } = renderCard();

    // 默认折叠：文件清单不可见
    expect(screen.queryByText('src/a.ts')).toBeNull();

    fireEvent.click(ai('integration-details-toggle'));

    expect(screen.getByText('src/a.ts')).toBeTruthy();
    expect(screen.getByText('src/c.ts')).toBeTruthy();
    // 溢出计数：filesTotal 25 - top 3 = 22
    expect(screen.getByText('decision.integration.filesOverflow')).toBeTruthy();
    // 分支/基线/HEAD 溯源（标签与值是同级文本节点，用正则匹配整行）
    expect(
      screen.getByText(/decision\.integration\.baseLabel/),
    ).toBeTruthy();
    expect(
      screen.getByText(/decision\.integration\.headLabel/),
    ).toBeTruthy();
    // 合入语义
    expect(screen.getByText('decision.integration.mergeHint')).toBeTruthy();

    // 再点收起
    fireEvent.click(ai('integration-details-toggle'));
    expect(screen.queryByText('src/a.ts')).toBeNull();
  });

  it('无脏工作区时不渲染警示块', () => {
    renderCard({
      ...integrationDecision,
      payload: { ...integrationDecision.payload, mainDirty: [] },
    });
    expect(
      screen.queryByText('decision.integration.dirtyWarning'),
    ).toBeNull();
  });

  it('integration 已入 PROPOSAL_KINDS 词表（决议路由走 proposal resolve 而非验收端点）', async () => {
    // 回归护栏：历史缺陷是 kind 词表漂移导致误路由到验收 acceptCompletion
    const { isProposalKind } = await import('./types');
    expect(isProposalKind('integration')).toBe(true);
  });
});
