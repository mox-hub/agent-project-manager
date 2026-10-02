import { cloneElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DefinitionRow } from './definition-row';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key),
  }),
}));

vi.mock('@/components/ui/sortable', () => ({
  SortableItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // 真实组件把 children 塞进 render 元素（RawButton aria-label 载体），mock 需同构
  SortableItemHandle: ({ children, render }: { children?: React.ReactNode; render?: React.ReactElement }) =>
    render ? cloneElement(render, {}, children) : <div>{children}</div>,
}));

describe('DefinitionRow（设置·定义类管理页通用行骨架）', () => {
  it('双行文本：title + description 渲染，行主体点击触发 onClick', () => {
    const onClick = vi.fn();
    render(
      <DefinitionRow
        id="r1"
        sortable={false}
        leading={<span data-testid="lead" />}
        title={<span>待办</span>}
        description="即将开始"
        onClick={onClick}
      />,
    );
    expect(screen.getByText('待办')).toBeTruthy();
    expect(screen.getByText('即将开始')).toBeTruthy();
    expect(screen.getByTestId('lead')).toBeTruthy();
    fireEvent.click(screen.getByText('待办'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('非 sortable 形态不渲染拖拽手柄', () => {
    render(
      <DefinitionRow
        id="r2"
        sortable={false}
        leading={null}
        title={<span>角色</span>}
      />,
    );
    expect(screen.queryByLabelText('拖拽排序')).toBeNull();
  });

  it('sortable 形态渲染拖拽手柄；trailing 槽独立于行主体点击区', () => {
    const onClick = vi.fn();
    const onTrailing = vi.fn();
    render(
      <DefinitionRow
        id="r3"
        leading={null}
        title={<span>状态</span>}
        onClick={onClick}
        trailing={
          <button type="button" aria-label="trailing-action" onClick={onTrailing}>
            act
          </button>
        }
      />,
    );
    expect(screen.getByLabelText('拖拽排序')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('trailing-action'));
    expect(onTrailing).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
