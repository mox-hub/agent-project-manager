/**
 * MarkdownView 单测（CAP-A-23 全局 Markdown 实体引用系统 · 渲染侧）
 *
 * 覆盖 GAP-T-43 ①：apm:// 链接渲染为引用胶囊（data-apm-ref +
 * RoutePreviewTrigger 包裹）、非 apm 链接保持外链行为、
 * 非法 apm:// 引用降级普通链接不静默吞。
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownView } from './markdown-view';

vi.mock('@/shared/route-preview/route-preview-trigger', () => ({
  RoutePreviewTrigger: ({
    children,
    path,
  }: {
    children: React.ReactNode;
    path: string;
  }) => (
    <span data-testid="route-preview-trigger" data-preview-path={path}>
      {children}
    </span>
  ),
}));

const renderMd = (content: string) =>
  render(
    <MemoryRouter>
      <MarkdownView content={content} />
    </MemoryRouter>,
  );

describe('MarkdownView apm:// 引用胶囊', () => {
  it('apm:// 链接渲染为胶囊（data-apm-ref + hover 预览触发器）', () => {
    renderMd('见 [登录页崩溃](apm://APM/issue/BUG-1) 详情');

    const chip = screen
      .getByText('登录页崩溃')
      .closest('a') as HTMLAnchorElement;
    expect(chip).toBeTruthy();
    expect(chip.getAttribute('data-apm-ref')).toBe('apm://APM/issue/BUG-1');
    expect(chip.getAttribute('title')).toContain('工单');
    const trigger = chip.parentElement as HTMLElement;
    expect(trigger.getAttribute('data-preview-path')).toBe(
      'apm://APM/issue/BUG-1',
    );
  });

  it('非 apm 链接保持外链行为（target=_blank + 下划线样式）', () => {
    renderMd('参考 [规范](https://example.com/spec)');

    const link = screen
      .getByText('规范')
      .closest('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://example.com/spec');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
    expect(link.getAttribute('data-apm-ref')).toBeNull();
    // 外链外层无预览触发器
    expect(
      link.parentElement?.getAttribute('data-preview-path'),
    ).toBeNull();
  });

  it('非法 apm:// 引用降级普通链接，不渲染胶囊不静默吞', () => {
    renderMd('坏引用 [x](apm://only-one-segment)');

    const link = screen.getByText('x').closest('a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('apm://only-one-segment');
    expect(link.getAttribute('data-apm-ref')).toBeNull();
    expect(
      link.parentElement?.getAttribute('data-preview-path'),
    ).toBeNull();
  });
});
