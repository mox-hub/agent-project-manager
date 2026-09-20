import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientWrapper } from '@/test-utils/providers';
import { api } from '@/infrastructure/api-client';
import { acceptanceApi } from '@/modules/acceptance/api/acceptance-api';
import {
  useResolveDecision,
  type DecisionResolutionAction,
} from './use-decisions';
import type { Decision } from '@/shared/decision-card/types';

vi.mock('@/infrastructure/api-client', () => ({
  api: {
    post: vi.fn().mockResolvedValue({ id: 'x', status: 'accepted' }),
    get: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/modules/auth/hooks/use-auth', () => ({
  useAuth: () => ({ currentUser: { id: 'u-1' } }),
}));

vi.mock('@/modules/acceptance/api/acceptance-api', () => ({
  acceptanceApi: {
    acceptCompletion: vi.fn().mockResolvedValue({}),
    rejectCompletion: vi.fn().mockResolvedValue({}),
    waiveCompletion: vi.fn().mockResolvedValue({}),
  },
}));

const mockPost = vi.mocked(api.post);

/**
 * 决议路由回归（P0）：
 * contract_conflict 曾不在 PROPOSAL_KINDS 词表内 → isProposalKind=false →
 * 落到 acceptance 兜底分支，把提案 id 调成 acceptCompletion（404）。
 * 本文件钉住各 kind 的端点与请求体形状。
 */

function makeDecision(kind: Decision['kind'], overrides?: Partial<Decision>): Decision {
  return {
    id: `${kind}:src-1`,
    kind,
    sourceId: 'src-1',
    status: 'pending',
    title: 't',
    urgency: 'advisory',
    proposer: { type: 'system' },
    payload: {},
    contentFingerprint: 'fp-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

async function resolve(decision: Decision, action: DecisionResolutionAction, reason?: string) {
  const { result } = renderHook(() => useResolveDecision(), {
    wrapper: QueryClientWrapper,
  });
  return waitFor(() =>
    result.current.mutateAsync({ decision, action, reason }),
  );
}

describe('useResolveDecision 动作路由', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('contract_conflict 三个裁决键 → proposals resolve + conflictAction 承载方向（不再误路由验收端点）', async () => {
    const decision = makeDecision('contract_conflict');

    await resolve(decision, 'accept_file');
    expect(mockPost).toHaveBeenLastCalledWith('/decisions/proposals/src-1/resolve', {
      action: 'accept',
      conflictAction: 'accept_file',
      reason: undefined,
      expectedFingerprint: 'fp-1',
    });

    await resolve(decision, 'accept_db');
    expect(mockPost).toHaveBeenLastCalledWith('/decisions/proposals/src-1/resolve', {
      action: 'accept',
      conflictAction: 'accept_db',
      reason: undefined,
      expectedFingerprint: 'fp-1',
    });

    await resolve(decision, 'detach');
    expect(mockPost).toHaveBeenLastCalledWith('/decisions/proposals/src-1/resolve', {
      action: 'accept',
      conflictAction: 'detach',
      reason: undefined,
      expectedFingerprint: 'fp-1',
    });

    // 验收端点绝不能被 contract_conflict 触达
    expect(acceptanceApi.acceptCompletion).not.toHaveBeenCalled();
  });

  it('contract_conflict reject：action=reject 仅留痕，不带 conflictAction；缺 reason 抛错不发请求', async () => {
    const decision = makeDecision('contract_conflict');

    await expect(resolve(decision, 'reject')).rejects.toThrow(/reason/);
    expect(mockPost).not.toHaveBeenCalled();

    await resolve(decision, 'reject', '稍后人工比对');
    expect(mockPost).toHaveBeenLastCalledWith('/decisions/proposals/src-1/resolve', {
      action: 'reject',
      reason: '稍后人工比对',
      expectedFingerprint: 'fp-1',
    });
    expect(acceptanceApi.rejectCompletion).not.toHaveBeenCalled();
  });

  it('resolution（普通示例卡路径）→ proposals resolve + action 原样透传（entityType 由后端从 payload 自解析）', async () => {
    await resolve(makeDecision('resolution'), 'accept');
    expect(mockPost).toHaveBeenLastCalledWith('/decisions/proposals/src-1/resolve', {
      action: 'accept',
      reason: undefined,
      answer: undefined,
      expectedFingerprint: 'fp-1',
    });
    expect(acceptanceApi.acceptCompletion).not.toHaveBeenCalled();
  });

  it('acceptance 仍走验收端点（实体来源不因词表扩容被劫持）', async () => {
    await resolve(makeDecision('acceptance'), 'accept');
    expect(acceptanceApi.acceptCompletion).toHaveBeenCalledWith('src-1', undefined, 'u-1');
    expect(mockPost).not.toHaveBeenCalled();
  });
});
