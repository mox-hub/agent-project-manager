/**
 * IssueDependenciesSection 测试（P1-17 详情页依赖区块）
 * - blocked by / blocks 双向渲染与跳转
 * - 数据空缺时的形态（双向皆空不渲染空块；单侧为空不渲染空组）
 * - 折叠交互
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { IssueDependenciesSection } from './issue-dependencies-section';
import type { TaskDependencyRef } from '../api/issue-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const dep = (overrides: Partial<TaskDependencyRef>): TaskDependencyRef =>
  ({
    id: 'dep-1',
    projectId: 'p1',
    issueId: 'issue-a',
    dependsOnIssueId: 'issue-b',
    type: 'blocks',
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }) as TaskDependencyRef;

const renderSection = (props: Parameters<typeof IssueDependenciesSection>[0]) =>
  render(
    <MemoryRouter>
      <IssueDependenciesSection {...props} />
    </MemoryRouter>,
  );

describe('IssueDependenciesSection（P1-17）', () => {
  it('双向皆有依赖：渲染两组，条目链接指向对应工单详情', () => {
    renderSection({
      dependencies: [
        dep({
          id: 'dep-up',
          dependsOnIssue: { id: 'issue-upstream', title: '上游：设计稿评审', status: 'in_progress' },
        }),
      ],
      blockedBy: [
        dep({
          id: 'dep-down',
          issueId: 'issue-a',
          dependsOnIssueId: 'issue-a',
          issue: { id: 'issue-downstream', title: '下游：联调部署', status: 'todo' },
        }),
      ],
    });

    const links = screen.getAllByTestId('issue-dependency-link');
    expect(links).toHaveLength(2);
    expect(screen.getByText('上游：设计稿评审').closest('a')?.getAttribute('href')).toBe(
      '/app/issues/issue-upstream',
    );
    expect(screen.getByText('下游：联调部署').closest('a')?.getAttribute('href')).toBe(
      '/app/issues/issue-downstream',
    );
  });

  it('双向皆空：不渲染空块', () => {
    const { container } = renderSection({ dependencies: [], blockedBy: [] });
    expect(container.querySelector('[data-testid="issue-dependencies-section"]')).toBeNull();
    expect(container).toBeEmptyDOMElement();
  });

  it('undefined 同样不渲染', () => {
    const { container } = renderSection({});
    expect(container).toBeEmptyDOMElement();
  });

  it('仅 upstream：只渲染 blocked by 组，不渲染 blocks 组', () => {
    renderSection({
      dependencies: [
        // 契约投影缺失时以 dependsOnIssueId 兜底（老字段形态数据不空指）
        dep({ id: 'dep-up', dependsOnIssueId: 'issue-fallback' }),
      ],
    });
    expect(screen.getAllByTestId('issue-dependency-link')).toHaveLength(1);
    expect(screen.getByText('issue-fallback').closest('a')?.getAttribute('href')).toBe(
      '/app/issues/issue-fallback',
    );
    // blocks 组标签（document.linkType.blocks）不出现
    expect(screen.queryByText('阻塞')).toBeNull();
  });

  it('折叠按钮收起后条目不可见（grid-rows 收展）', () => {
    renderSection({
      blockedBy: [
        dep({
          id: 'dep-down',
          issueId: 'issue-a',
          dependsOnIssueId: 'issue-a',
          issue: { id: 'issue-downstream', title: '下游：联调部署', status: 'todo' },
        }),
      ],
    });
    const collapseBtn = screen.getByRole('button', { name: 'common.collapse' });
    fireEvent.click(collapseBtn);
    // aria 状态翻转；内容容器收起（高度 0fr 语义由 class 断言）
    expect(screen.getByRole('button', { name: 'common.expand' })).toBeTruthy();
    const section = screen.getByTestId('issue-dependencies-section');
    expect(section.innerHTML).toContain('grid-rows-[0fr]');
  });
});
