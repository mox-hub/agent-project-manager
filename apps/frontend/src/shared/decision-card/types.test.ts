import { describe, expect, it } from 'vitest';
import { PROPOSAL_KINDS, isProposalKind, type DecisionKind } from './types';

/**
 * 决策 kind 清单的**跨端一致性**守卫。
 *
 * 背景（真实缺陷）：`release` 类提案由 `ReleaseService.createApprovalProposal`
 * 投递、由 `ProposalService.apply()` 的 `case 'release'` 分发，但前端 `DecisionKind`
 * 与决议路由的 kind 清单里都没有它 → `useResolveDecision` 落到 acceptance 分支，
 * 把「批准发布」调成 `acceptCompletion`（验收通过）。`workflow_def` 同样漏在前端
 * 那份手抄副本里。本文件把清单钉在服务端 `PROPOSAL_KIND_VALUES` 的同一取值集上。
 *
 * 服务端对应位置：`apps/server/src/modules/decision/dto/decision.dto.ts`。
 * 若该文件的 `PROPOSAL_KIND_VALUES` 增删，这里必须同步改——这就是本用例的用途。
 */
const SERVER_PROPOSAL_KINDS = [
  'plan',
  'assignment',
  'resolution',
  'spend',
  'clarify',
  'gate',
  'workflow_def',
  'release',
];

describe('PROPOSAL_KINDS', () => {
  it('与服务端 PROPOSAL_KIND_VALUES 取值集逐一相同（含顺序）', () => {
    expect([...PROPOSAL_KINDS]).toEqual(SERVER_PROPOSAL_KINDS);
  });

  it('isProposalKind 对每个建议类 kind 为真——它们必须走 /decisions/proposals', () => {
    for (const kind of SERVER_PROPOSAL_KINDS) {
      expect(isProposalKind(kind as DecisionKind)).toBe(true);
    }
  });

  it('两条实体来源不是建议类——它们各有原生端点，绝不能走 proposals', () => {
    expect(isProposalKind('approval')).toBe(false);
    expect(isProposalKind('acceptance')).toBe(false);
  });

  it('release 必须在列（否则「批准发版」会被误当「验收通过」）', () => {
    expect(PROPOSAL_KINDS).toContain('release');
  });
});
