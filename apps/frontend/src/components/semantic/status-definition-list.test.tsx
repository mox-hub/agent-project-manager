import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { StatusDefinitionList } from './status-definition-list';
import type { StatusDefinitionLike } from './status-definition-list';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: unknown, opts?: Record<string, unknown>) => {
      const TEMPLATES: Record<string, string> = {
        'settings.transitionCount': '{{count}} 个流转',
      };
      const fallback =
        TEMPLATES[key]
        ?? (typeof fallbackOrOpts === 'string'
          ? fallbackOrOpts
          : typeof fallbackOrOpts === 'object' && fallbackOrOpts !== null
            ? key
            : (opts as unknown as string | undefined) ?? key);
      const interp =
        typeof fallbackOrOpts === 'object' && fallbackOrOpts !== null
          ? fallbackOrOpts
          : typeof opts === 'object' && opts !== null
            ? opts
            : undefined;
      if (interp) {
        return (fallback as string).replace(/{{(\w+)}}/g, (_, name: string) =>
          String((interp as Record<string, unknown>)[name] ?? ''),
        );
      }
      return fallback as string;
    },
  }),
}));

vi.mock('@/components/ui/sortable', () => ({
  Sortable: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SortableItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SortableItemHandle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const def = (over: Partial<StatusDefinitionLike>): StatusDefinitionLike => ({
  id: over.key ?? 'x',
  key: 'x',
  name: '状态',
  order: 10,
  ...over,
});

describe('StatusDefinitionList（分组列表语义组件）', () => {
  it('按 group 聚合渲染：组头词表键 + 状态名落入对应分组', () => {
    render(
      <StatusDefinitionList
        definitions={[
          def({ id: 'a', key: 'todo', name: '待办', group: 'unstarted', order: 10 }),
          def({ id: 'b', key: 'done', name: '已完成', group: 'completed', order: 50 }),
        ]}
      />,
    );
    expect(screen.getByText('settings.statusGroup.unstarted')).toBeTruthy();
    expect(screen.getByText('settings.statusGroup.completed')).toBeTruthy();
    expect(screen.getByText('待办')).toBeTruthy();
    expect(screen.getByText('已完成')).toBeTruthy();
  });

  it('真实 color 落到图标 inline style（不靠启发式映射）', () => {
    const { container } = render(
      <StatusDefinitionList
        definitions={[
          def({ id: 'a', key: 'in_progress', name: '进行中', group: 'started', color: '#3b82f6' }),
        ]}
      />,
    );
    const svg = container.querySelector('svg[style]');
    expect(svg).not.toBeNull();
    expect((svg as unknown as HTMLElement).style.color).toBe('rgb(59, 130, 246)');
  });

  it('流转徽标：配置了白名单的状态显示流转计数与目标名 title', () => {
    render(
      <StatusDefinitionList
        definitions={[
          def({
            id: 'a',
            key: 'todo',
            name: '待办',
            group: 'unstarted',
            allowedNextStatusKeys: ['in_progress', 'canceled'],
          }),
          def({ id: 'b', key: 'in_progress', name: '进行中', group: 'started' }),
          def({ id: 'c', key: 'canceled', name: '已取消', group: 'canceled' }),
        ]}
      />,
    );
    const badge = screen.getByTitle('settings.allowedNextStatuses：进行中、已取消');
    expect(badge.textContent).toContain('2');
  });

  it('点击状态名触发 onEdit；组头「+」携带目标分组', () => {
    const onEdit = vi.fn();
    const onCreate = vi.fn();
    render(
      <StatusDefinitionList
        definitions={[def({ id: 'a', key: 'todo', name: '待办', group: 'unstarted' })]}
        onEdit={onEdit}
        onCreate={onCreate}
      />,
    );
    fireEvent.click(screen.getByText('待办'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ key: 'todo' }));
    const addButtons = screen.getAllByRole('button', { name: 'settings.addStatus' });
    fireEvent.click(addButtons[0]);
    expect(onCreate).toHaveBeenCalledWith('triage');
  });

  it('空分组渲染组描述占位（可定位往空组添加）', () => {
    render(<StatusDefinitionList definitions={[]} />);
    expect(screen.getByText('settings.statusGroup.triageDesc')).toBeTruthy();
  });
});
