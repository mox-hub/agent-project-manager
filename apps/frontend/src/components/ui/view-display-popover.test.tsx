import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import i18n from '@/i18n';
import {
  ViewDisplayPopover,
  getDefaultDisplayProperties,
  getDefaultGroupOptions,
  getDefaultOrderOptions,
  getDefaultViewOptions,
} from './view-display-popover';

describe('ViewDisplayPopover', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN');
  });

  it('中文环境下完整渲染各分组、开关、排序及展示属性，并正确响应交互', () => {
    const handleViewModeChange = vi.fn();
    const handleGroupByChange = vi.fn();
    const handleSubGroupByChange = vi.fn();
    const handleOrderByChange = vi.fn();
    const handleOrderDirectionToggle = vi.fn();
    const handleCompletedFilterChange = vi.fn();
    const handleShowSubIssuesChange = vi.fn();
    const handleShowEmptyGroupsChange = vi.fn();
    const handleToggleDisplayProperty = vi.fn();

    render(
      <ViewDisplayPopover
        viewMode="board"
        onViewModeChange={handleViewModeChange}
        groupBy="status"
        onGroupByChange={handleGroupByChange}
        subGroupBy="none"
        onSubGroupByChange={handleSubGroupByChange}
        orderBy="priority"
        onOrderByChange={handleOrderByChange}
        orderDirection="desc"
        onOrderDirectionToggle={handleOrderDirectionToggle}
        completedFilter="all"
        onCompletedFilterChange={handleCompletedFilterChange}
        showSubIssues={true}
        onShowSubIssuesChange={handleShowSubIssuesChange}
        showEmptyGroups={false}
        onShowEmptyGroupsChange={handleShowEmptyGroupsChange}
        displayProperties={{ id: true, status: true, aiExecution: true }}
        onToggleDisplayProperty={handleToggleDisplayProperty}
      />,
    );

    // 视图切换（中文字段：列表、看板、甘特图、表格）
    expect(screen.getByRole('button', { name: /列表/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /看板/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /列表/ }));
    expect(handleViewModeChange).toHaveBeenCalledWith('list');

    // 分组和次级分组标题
    expect(screen.getByText('分组')).toBeInTheDocument();
    expect(screen.getByText('次级分组')).toBeInTheDocument();

    // 排序标题与升降序提示
    expect(screen.getByText('排序')).toBeInTheDocument();
    const orderDirectionBtn = screen.getByTitle(/降序（点击切换为升序）/);
    expect(orderDirectionBtn).toBeInTheDocument();
    fireEvent.click(orderDirectionBtn);
    expect(handleOrderDirectionToggle).toHaveBeenCalled();

    // 完成项与子工单开关
    expect(screen.getByText('已完成工单')).toBeInTheDocument();
    expect(screen.getByText('显示子工单')).toBeInTheDocument();

    // 看板选项与显示空分组
    expect(screen.getByText('看板选项')).toBeInTheDocument();
    expect(screen.getByText('显示空分组')).toBeInTheDocument();

    // 展示属性标题及属性胶囊（覆盖 ID/编号、状态、负责人、AI 状态等）
    expect(screen.getByText('展示属性')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^状态$/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^AI 状态$/ })).toBeInTheDocument();

    const idBtn = screen.getByRole('button', { name: /^编号$/ });
    expect(idBtn).toBeInTheDocument();
    fireEvent.click(idBtn);
    expect(handleToggleDisplayProperty).toHaveBeenCalledWith('id');
  });

  it('英文环境下完整渲染各字段与 options', async () => {
    await i18n.changeLanguage('en');

    render(
      <ViewDisplayPopover
        viewMode="list"
        onViewModeChange={vi.fn()}
        groupBy="status"
        onGroupByChange={vi.fn()}
        orderBy="priority"
        onOrderByChange={vi.fn()}
        orderDirection="asc"
        onOrderDirectionToggle={vi.fn()}
        completedFilter="active"
        onCompletedFilterChange={vi.fn()}
        showSubIssues={false}
        onShowSubIssuesChange={vi.fn()}
        onToggleDisplayProperty={vi.fn()}
      />,
    );

    // 英文视图模式与分块
    expect(screen.getByRole('button', { name: /List/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Board/ })).toBeInTheDocument();
    expect(screen.getByText('Grouping')).toBeInTheDocument();
    expect(screen.getByText('Ordering')).toBeInTheDocument();
    expect(screen.getByTitle(/Ascending \(click to desc\)/)).toBeInTheDocument();
    expect(screen.getByText('Completed issues')).toBeInTheDocument();
    expect(screen.getByText('Show sub-issues')).toBeInTheDocument();
    expect(screen.getByText('List options')).toBeInTheDocument();
    expect(screen.getByText('Display properties')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Status/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /AI State/ })).toBeInTheDocument();
  });

  it('helper 生成函数支持传入国际化翻译器', () => {
    const mockT = (key: string, def?: string) => `trans_${key}_${def}`;
    const views = getDefaultViewOptions(mockT);
    expect(views[0].label).toContain('trans_viewDisplay.views.list');

    const groups = getDefaultGroupOptions(mockT);
    expect(groups[0].label).toContain('trans_viewDisplay.groupOptions.none');

    const orders = getDefaultOrderOptions(mockT);
    expect(orders[0].label).toContain('trans_viewDisplay.orderOptions.priority');

    const props = getDefaultDisplayProperties(mockT);
    expect(props[0].label).toContain('trans_viewDisplay.properties.id');
  });
});

