import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RunApprovalsSection } from './run-approvals-section';

// i18n mock 仅透传键名，断言直接对着键写（run-isolation-badge.test 同款）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const base = {
  id: 'appr1',
  requestedAction: '提交工单「登录链路回归」的验收申请',
  actionType: 'execution_completion',
  riskLevel: 'medium',
  status: 'pending',
  requestedAt: '2026-10-02T00:00:00Z',
};

describe('RunApprovalsSection（CAP-A-27 审批段 + AI 定级附注）', () => {
  it('无审批单 → 整段不渲染', () => {
    const { container } = render(<RunApprovalsSection approvals={[]} />);
    expect(container.querySelector('li')).toBeNull();
  });

  it('审批单渲染：requestedAction + 风险徽章 + 状态', () => {
    render(<RunApprovalsSection approvals={[{ ...base, riskLevel: 'high_risk' }]} />);

    expect(screen.getByText('提交工单「登录链路回归」的验收申请')).toBeTruthy();
    expect(screen.getByText('runApprovals.risk.high_risk')).toBeTruthy();
    expect(screen.getByText('runApprovals.statusPending')).toBeTruthy();
  });

  it('metadata.aiJudge 存在 → 渲染 AI 定级附注（高置信不带低置信标注）', () => {
    render(
      <RunApprovalsSection
        approvals={[
          {
            ...base,
            metadata: {
              aiJudge: {
                riskLevel: 'write',
                confidence: 0.92,
                safeToAutoApprove: 0.4,
                advisory: true,
              },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/runApprovals\.risk\.write/)).toBeTruthy();
    expect(screen.getByText(/92%/)).toBeTruthy();
    expect(screen.queryByText('runApprovals.lowConfidence')).toBeNull();
  });

  it('低置信（<0.7）→ 显式标注低置信', () => {
    render(
      <RunApprovalsSection
        approvals={[
          {
            ...base,
            metadata: {
              aiJudge: { riskLevel: 'write', confidence: 0.41, advisory: true },
            },
          },
        ]}
      />,
    );

    expect(screen.getByText(/41%/)).toBeTruthy();
    expect(screen.getByText(/runApprovals\.lowConfidence/)).toBeTruthy();
  });

  it('metadata 无 aiJudge → 只渲染审批单本体，无 AI 附注', () => {
    render(<RunApprovalsSection approvals={[{ ...base, metadata: { source: 'manual' } }]} />);

    expect(screen.getByText('提交工单「登录链路回归」的验收申请')).toBeTruthy();
    expect(screen.queryByText(/AI /)).toBeNull();
  });
});
