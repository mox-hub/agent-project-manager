/**
 * AcceptanceCriteriaPreview 单测（P1-9 正文区验收标准只读回显）
 *
 * 覆盖：多状态条目渲染（passed/failed/pending/blocked）、只读（无判定/编辑控件）、
 * 编辑链接展开右栏（onOpenEditor）、契约标题链接同右栏目标、进度计数、
 * 无契约 / 契约无标准时不渲染空块。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { AcceptanceCriteriaPreview } from './acceptance-criteria-preview';
import type {
  Acceptance,
  AcceptanceCriterion,
} from '@/modules/acceptance/api/acceptance-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: string | { defaultValue?: string }) =>
      typeof opts === 'string' ? opts : (opts?.defaultValue ?? key),
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const criterion = (
  overrides: Partial<AcceptanceCriterion> & { id: string },
): AcceptanceCriterion => ({
  acceptanceId: 'acc-1',
  criteriaType: 'functional',
  content: '',
  status: 'pending',
  severity: 'medium',
  order: 0,
  ...overrides,
});

const acceptance = (
  id: string,
  criteria: AcceptanceCriterion[],
  extra: Partial<Acceptance> = {},
): Acceptance => ({
  id,
  issueId: 'issue-1',
  status: 'in_review',
  completionType: 'artifact',
  completionEvidence: null,
  criteria,
  ...extra,
});

const renderPreview = (
  acceptances: Acceptance[],
  onOpenEditor?: () => void,
) =>
  render(
    <MemoryRouter>
      <AcceptanceCriteriaPreview acceptances={acceptances} onOpenEditor={onOpenEditor} />
    </MemoryRouter>,
  );

describe('AcceptanceCriteriaPreview', () => {
  it('renders criteria entries of every status with their status labels', () => {
    renderPreview([
      acceptance('acc-1', [
        criterion({ id: 'c1', content: '登录接口返回 200', status: 'passed', order: 1 }),
        criterion({ id: 'c2', content: '单测覆盖率不低于 80%', status: 'failed', order: 2 }),
        criterion({ id: 'c3', content: '补充接口文档', status: 'pending', order: 3 }),
        criterion({ id: 'c4', content: '阻断项清零', status: 'blocked', order: 4 }),
      ]),
    ]);

    // 条目正文逐一回显
    expect(screen.getByText('登录接口返回 200')).toBeTruthy();
    expect(screen.getByText('单测覆盖率不低于 80%')).toBeTruthy();
    expect(screen.getByText('补充接口文档')).toBeTruthy();
    expect(screen.getByText('阻断项清零')).toBeTruthy();
    // 状态文案（mock t 返回 key 本身，验证四种状态均有区分渲染）
    expect(screen.getByText('acceptance.criterionStatus.passed')).toBeTruthy();
    expect(screen.getByText('acceptance.criterionStatus.failed')).toBeTruthy();
    expect(screen.getByText('acceptance.criterionStatus.pending')).toBeTruthy();
    expect(screen.getByText('acceptance.criterionStatus.blocked')).toBeTruthy();
    // 区块标题 + 进度（1/4 已通过）
    expect(screen.getByText('taskDetail.acceptanceContract')).toBeTruthy();
    expect(screen.getByText('1/4')).toBeTruthy();
  });

  it('stays read-only: criteria rows expose no toggle or edit controls', () => {
    const onOpenEditor = vi.fn();
    renderPreview(
      [acceptance('acc-1', [
        criterion({ id: 'c1', content: '登录接口返回 200', status: 'passed' }),
      ])],
      onOpenEditor,
    );

    // 正文条目不含任何可点击切换状态的控件（判定能力只在验收详情页）
    const list = screen.getByText('登录接口返回 200').closest('ul');
    expect(list).toBeTruthy();
    expect(list!.querySelectorAll('button').length).toBe(0);
    // 整个回显区的 button 仅「编辑」（展开右栏）与「收起」两个
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  it('links the edit affordance to the right-rail via onOpenEditor', () => {
    const onOpenEditor = vi.fn();
    renderPreview(
      [acceptance('acc-1', [criterion({ id: 'c1', content: '标准一', status: 'pending' })])],
      onOpenEditor,
    );

    fireEvent.click(screen.getByTitle('common.edit'));
    expect(onOpenEditor).toHaveBeenCalledTimes(1);
  });

  it('hides the edit affordance when no onOpenEditor is provided', () => {
    renderPreview([
      acceptance('acc-1', [criterion({ id: 'c1', content: '标准一', status: 'pending' })]),
    ]);

    expect(screen.queryByTitle('common.edit')).toBeNull();
  });

  it('links each contract title to its acceptance detail page (same target as the right rail)', () => {
    renderPreview([
      acceptance('acc-1', [criterion({ id: 'c1', content: '标准一', status: 'pending' })], {
        title: '登录功能验收',
      }),
      acceptance('acc-2', [criterion({ id: 'c2', content: '标准二', status: 'failed' })], {
        title: '性能验收',
      }),
    ]);

    const first = screen.getByText('登录功能验收').closest('a');
    const second = screen.getByText('性能验收').closest('a');
    expect(first?.getAttribute('href')).toBe('/app/acceptance/acc-1');
    expect(second?.getAttribute('href')).toBe('/app/acceptance/acc-2');
  });

  it('renders nothing when there are no acceptances', () => {
    const { container } = renderPreview([]);
    expect(container.querySelector('ul')).toBeNull();
    expect(container.textContent).toBe('');
  });

  it('renders nothing when contracts exist but none has criteria', () => {
    const { container } = renderPreview([
      acceptance('acc-1', [], { title: '空契约' }),
    ]);
    expect(container.textContent).toBe('');
  });

  it('sorts criteria by order within a contract', () => {
    renderPreview([
      acceptance('acc-1', [
        criterion({ id: 'c2', content: '第二条', status: 'pending', order: 2 }),
        criterion({ id: 'c1', content: '第一条', status: 'pending', order: 1 }),
      ]),
    ]);

    const texts = Array.from(
      screen.getByText('第一条').closest('ul')!.querySelectorAll('li'),
    ).map((li) => li.querySelector('span')!.textContent);
    expect(texts).toEqual(['第一条', '第二条']);
  });
});
