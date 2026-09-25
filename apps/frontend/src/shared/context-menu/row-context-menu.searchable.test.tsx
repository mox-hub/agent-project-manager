/**
 * 行右键菜单 searchable 子菜单测试：
 * - 构建器层：候选 ≥ 8 时 标签/负责人 子菜单带 searchable，候选项带 searchText
 * - 渲染层：searchable 子菜单出现过滤输入框，输入即时过滤候选项
 */
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { buildTaskRowMenu, type TaskRowMenuOptions } from './row-context-menu';
import { ContextMenu } from '@/components/ui/context-menu';
import type { Task } from '@/modules/issue/api/issue-api';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: unknown) => (typeof fallback === 'string' ? fallback : key) }),
}));

function makeTask(): Task {
  return {
    id: 't1',
    title: '示例任务',
    status: 'todo',
    priority: 'medium',
    type: 'task',
    issueTags: [],
  } as unknown as Task;
}

function makeOpts(over: Partial<TaskRowMenuOptions> = {}): TaskRowMenuOptions {
  return {
    task: makeTask(),
    ...over,
  };
}

describe('buildTaskRowMenu searchable 标志', () => {
  it('标签候选 < 8 不启用搜索', () => {
    const menu = buildTaskRowMenu(makeOpts({ tags: [{ id: 'g1', name: 'gui' }] }));
    const tags = menu.find((item) => item.id === 'meta-tags');
    expect(tags?.searchable).toBeFalsy();
  });

  it('标签候选 ≥ 8 启用搜索且候选带 searchText', () => {
    const tags = Array.from({ length: 10 }, (_, i) => ({ id: `g${i}`, name: `标签${i}` }));
    const menu = buildTaskRowMenu(makeOpts({ tags }));
    const tagsMenu = menu.find((item) => item.id === 'meta-tags');
    expect(tagsMenu?.searchable).toBe(true);
    expect(tagsMenu?.children?.[0]?.searchText).toBe('标签0');
  });

  it('负责人候选 ≥ 8 启用搜索', () => {
    const assignees = Array.from({ length: 9 }, (_, i) => ({
      id: `m${i}`,
      displayName: `成员${i}`,
      userId: `u${i}`,
    }));
    const menu = buildTaskRowMenu(makeOpts({ assignees }));
    const assigneeMenu = menu.find((item) => item.id === 'meta-assignee');
    expect(assigneeMenu?.searchable).toBe(true);
  });
});

describe('ContextMenu searchable 子菜单渲染', () => {
  beforeAll(() => {
    // jsdom 缺 getAnimations（base-ui 弹层淡入动画）
    Element.prototype.getAnimations = vi.fn(() => []) as never;
    if (!globalThis.PointerEvent) {
      // minimal PointerEvent polyfill：base-ui 弹层指针事件依赖
      class PointerEventPolyfill extends MouseEvent {
        constructor(type: string, params: PointerEventInit = {}) {
          super(type, params);
        }
      }
      (globalThis as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
    }
  });

  const tags = Array.from({ length: 10 }, (_, i) => ({ id: `g${i}`, name: `标签${i}` }));

  function renderMenu() {
    const menu = buildTaskRowMenu(makeOpts({ tags }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <ContextMenu items={menu}>
          <div data-testid="row">行内容</div>
        </ContextMenu>
      </QueryClientProvider>,
    );
  }

  it('右键打开菜单，searchable 子菜单有过滤框且输入即过滤', async () => {
    renderMenu();
    fireEvent.contextMenu(screen.getByTestId('row'));
    // 一级菜单：标签子菜单触发项可见
    const tagsTrigger = await screen.findByText('标签');
    expect(tagsTrigger).toBeTruthy();
    // 悬停展开二级菜单：base-ui SubmenuTrigger 对 pointermove 响应（pointerenter 不触发）
    fireEvent.pointerMove(tagsTrigger);
    let input: HTMLElement | null = null;
    try {
      input = await screen.findByPlaceholderText('搜索', {}, { timeout: 1000 });
    } catch {
      // 兜底：键盘展开（focus + ArrowRight）
      (tagsTrigger as HTMLElement).focus();
      fireEvent.keyDown(tagsTrigger, { key: 'ArrowRight' });
      input = await screen.findByPlaceholderText('搜索');
    }
    // 全量候选渲染
    expect(screen.getByText('标签0')).toBeTruthy();
    // 输入过滤：9 被 10 共享包含，改用独占词断言
    fireEvent.change(input, { target: { value: '标签3' } });
    expect(screen.getByText('标签3')).toBeTruthy();
    expect(screen.queryByText('标签0')).toBeNull();
    // 无命中空态
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText('无匹配')).toBeTruthy();
  });
});
