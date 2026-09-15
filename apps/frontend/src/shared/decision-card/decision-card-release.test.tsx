import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/i18n';
import { DecisionCard } from './decision-card';
import type { Decision } from './types';

/**
 * release 决策卡（发布审批）：payload 取自
 * `ReleaseService.createApprovalProposal` 原样写入的
 * `{ releaseId, version, scopeCount, gateResult }`。
 *
 * 本文件守两条诚实性：
 * ① 动作键是「批准发布」而非验收语义的「通过」（曾经的误路由就是把这两者混为一谈）；
 * ② 门禁没跑过就明说，**不**显示"0 项未过"这种把"没查"读成"全过"的写法。
 *
 * 断言用**英文**：jsdom 的 `navigator.language` 是 en-US，i18next 的
 * LanguageDetector 因此解析到 en（`fallbackLng` = zh-CN 只在缺资源时兜底）。
 * 与同目录 `decision-card-gate.test.tsx` 的既有写法一致。
 * 注意门禁**检查项本身**（`验收齐备` / `3/3 已验收`…）来自 payload 数据，
 * 不走 i18n，故仍以原文中文断言。
 */

const basePayload = {
  releaseId: 'rel-1',
  version: 'v1.4.0',
  scopeCount: 3,
  gateResult: {
    passed: false,
    checks: [
      { key: 'acceptance', label: '验收齐备', passed: true, detail: '3/3 已验收' },
      { key: 'changelog', label: 'CHANGELOG 一致性', passed: false, detail: '本地有手改' },
    ],
  },
};

function releaseDecision(over: Partial<Decision> = {}): Decision {
  return {
    id: 'release:prop-1',
    kind: 'release',
    sourceId: 'prop-1',
    status: 'pending',
    title: '发布 v1.4.0「报销提速」',
    detail: '把报销单提交链路的等待时间砍半。',
    urgency: 'advisory',
    projectId: 'p1',
    projectName: '报销系统',
    proposer: { type: 'human', name: '张三' },
    payload: basePayload,
    createdAt: new Date().toISOString(),
    ...over,
  };
}

describe('DecisionCard（release）', () => {
  it('标题与发版说明来自决策记录，不另造文案', () => {
    render(<DecisionCard decision={releaseDecision()} onAction={vi.fn()} />);

    expect(screen.getByText('发布 v1.4.0「报销提速」')).toBeInTheDocument();
    expect(screen.getByText('把报销单提交链路的等待时间砍半。')).toBeInTheDocument();
  });

  it('门禁逐项如实渲染：过的给过、拒的给拒因', () => {
    render(<DecisionCard decision={releaseDecision()} onAction={vi.fn()} />);

    expect(screen.getByText('验收齐备')).toBeInTheDocument();
    expect(screen.getByText('3/3 已验收')).toBeInTheDocument();
    expect(screen.getByText('CHANGELOG 一致性')).toBeInTheDocument();
    expect(screen.getByText('本地有手改')).toBeInTheDocument();
  });

  it('动作键是「批准发布」——不是验收语义的「通过」', () => {
    render(<DecisionCard decision={releaseDecision()} onAction={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Approve release/i })).toBeInTheDocument();
    // 曾经的误路由：release 提案落到验收分支，于是动作键被渲染成「通过门禁」
    expect(screen.queryByRole('button', { name: /Pass gate/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeInTheDocument();
  });

  it('门禁未跑过时明说，不渲染"0 项未过"冒充全过', () => {
    render(
      <DecisionCard
        decision={releaseDecision({
          payload: { releaseId: 'rel-1', version: 'v1.4.0' },
        })}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText(/Gate has not run yet/)).toBeInTheDocument();
    // 「没查」不得被读成「全过」：绝不能出现"0 failing"这种把缺数据当结论的写法
    expect(screen.queryByText(/^0 failing$/)).not.toBeInTheDocument();
  });

  it('范围未圈定时不显示 0，而是说明未圈定', () => {
    render(
      <DecisionCard
        decision={releaseDecision({
          payload: { releaseId: 'rel-1', version: 'v1.4.0' },
        })}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText('Scope not set')).toBeInTheDocument();
    expect(screen.queryByText(/^0 issues$/)).not.toBeInTheDocument();
  });
});
