import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ViewDisplayPopover,
} from './view-display-popover';

describe('ViewDisplayPopover', () => {
  it('渲染视图切换、分组、排序、完成项和属性胶囊', () => {
    const handleViewModeChange = vi.fn();
    const handleGroupByChange = vi.fn();
    const handleOrderByChange = vi.fn();
    const handleOrderDirectionToggle = vi.fn();
    const handleCompletedFilterChange = vi.fn();
    const handleShowSubIssuesChange = vi.fn();
    const handleToggleDisplayProperty = vi.fn();

    render(
      <ViewDisplayPopover
        viewMode="list"
        onViewModeChange={handleViewModeChange}
        groupBy="status"
        onGroupByChange={handleGroupByChange}
        orderBy="priority"
        onOrderByChange={handleOrderByChange}
        orderDirection="desc"
        onOrderDirectionToggle={handleOrderDirectionToggle}
        completedFilter="all"
        onCompletedFilterChange={handleCompletedFilterChange}
        showSubIssues={true}
        onShowSubIssuesChange={handleShowSubIssuesChange}
        displayProperties={{ id: true, status: true }}
        onToggleDisplayProperty={handleToggleDisplayProperty}
      />,
    );

    // 视图切换
    expect(screen.getByRole('button', { name: /List/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Board/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Board/i }));
    expect(handleViewModeChange).toHaveBeenCalledWith('board');

    // 属性胶囊
    expect(screen.getByRole('button', { name: /^Status$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^ID$/i }));
    expect(handleToggleDisplayProperty).toHaveBeenCalledWith('id');

    // 排序方向
    const orderDirectionBtn = screen.getByTitle(/Descending/i);
    fireEvent.click(orderDirectionBtn);
    expect(handleOrderDirectionToggle).toHaveBeenCalled();
  });
});
