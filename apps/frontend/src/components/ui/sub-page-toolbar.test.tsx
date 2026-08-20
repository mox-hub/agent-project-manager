import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SubPageToolbar } from './sub-page-toolbar';

function renderToolbar(overrides?: Partial<Parameters<typeof SubPageToolbar>[0]>) {
  return render(
    <MemoryRouter>
      <SubPageToolbar
        onBack={vi.fn()}
        breadcrumbs={[
          { label: 'Tasks', to: '/app/tasks' },
          { label: 'TASK-1234' },
        ]}
        tabs={{
          value: 'board',
          onChange: vi.fn(),
          items: [
            { value: 'overview', label: 'Overview' },
            { value: 'board', label: 'Board' },
            { value: 'settings', label: 'Settings' },
          ],
        }}
        pager={{ hasPrev: true, hasNext: false, onPrev: vi.fn(), onNext: vi.fn(), position: '3/12' }}
        sidebar={{ open: true, onToggle: vi.fn() }}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('SubPageToolbar', () => {
  it('渲染返回按钮、面包屑、居中页签、翻页器与侧栏开关', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByText('TASK-1234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Board' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByText('3/12')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hide sidebar' })).toBeInTheDocument();
  });

  it('无 prev/next 数据时翻页按钮禁用并显示占位', () => {
    renderToolbar({
      pager: { hasPrev: false, hasNext: false, onPrev: vi.fn(), onNext: vi.fn() },
    });
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('点击页签触发 onChange；sidebar 关闭时按钮文案切换', () => {
    const onChange = vi.fn();
    const onToggle = vi.fn();
    renderToolbar({
      tabs: { value: 'overview', onChange, items: [{ value: 'overview', label: 'Overview' }, { value: 'board', label: 'Board' }] },
      sidebar: { open: false, onToggle },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Board' }));
    expect(onChange).toHaveBeenCalledWith('board');
    expect(screen.getByRole('button', { name: 'Show sidebar' })).toBeInTheDocument();
  });

  it('不传 sidebar 时不渲染侧栏按钮；不传 tabs 时居中区为空', () => {
    renderToolbar({ sidebar: undefined, tabs: undefined });
    expect(screen.queryByRole('button', { name: /sidebar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Board' })).not.toBeInTheDocument();
  });

  it('面包屑中间层可点击、末项不可点击', () => {
    renderToolbar({
      tabs: undefined,
      breadcrumbs: [
        { label: 'Projects', to: '/app/projects' },
        { label: 'Nebula', to: '/app/projects/p1' },
        { label: 'Board' },
      ],
    });
    expect(screen.getByRole('link', { name: 'Nebula' })).toBeInTheDocument();
    const last = screen.getByText('Board');
    expect(last.closest('a')).toBeNull();
  });
});
