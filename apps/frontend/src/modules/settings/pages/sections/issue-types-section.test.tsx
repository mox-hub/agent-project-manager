import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from 'react-router-dom';
import { IssueTypesSettingsSection } from './issue-types-section';
import type { IssueTypeMeta } from '@/modules/issue/api/issue-type-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: unknown, opts?: Record<string, unknown>) => {
      const fallback =
        typeof fallbackOrOpts === 'string'
          ? fallbackOrOpts
          : typeof fallbackOrOpts === 'object' && fallbackOrOpts !== null
            ? key
            : (opts as unknown as string | undefined) ?? key;
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

vi.mock('@/components/ui/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const updateMock = vi.fn().mockResolvedValue({});
const createMock = vi.fn().mockResolvedValue({});
const deleteMock = vi.fn().mockResolvedValue(undefined);

const confirmMock = vi.fn().mockResolvedValue(true);
vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => confirmMock,
}));

vi.mock('@/modules/issue/hooks/use-issue-types', () => ({
  useIssueTypes: vi.fn(),
  useCreateIssueType: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateIssueType: () => ({ mutateAsync: updateMock, isPending: false }),
  useDeleteIssueType: () => ({ mutateAsync: deleteMock, isPending: false }),
}));

vi.mock('@/modules/core-config/hooks/use-metadata', () => ({
  useStatuses: () => ({ data: [{ id: 's1', projectId: null, group: 'unstarted' }] }),
}));

import { useIssueTypes } from '@/modules/issue/hooks/use-issue-types';

// base-ui Switch 点击路径依赖 window.PointerEvent（jsdom 缺失，同 dock-section.test）
beforeAll(() => {
  if (typeof (window as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
    (window as unknown as { PointerEvent: unknown }).PointerEvent = class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    };
  }
});

const taskType: IssueTypeMeta = {
  id: 'type-task',
  key: 'task',
  name: '任务',
  description: '跟踪通用任务和后续任务',
  icon: 'Circle',
  color: '#5E6AD2',
  order: 10,
  isSystem: true,
  enabled: true,
  fieldSchema: null,
  _count: { tasks: 7 },
};

const storyType: IssueTypeMeta = {
  id: 'type-story',
  key: 'story',
  name: '用户故事',
  icon: 'UserRound',
  color: '#8B5CF6',
  order: 20,
  isSystem: false,
  enabled: true,
  fieldSchema: [{ key: 'persona', label: '角色', type: 'text', order: 1 }],
  _count: { tasks: 0 },
};

function mockTypes(data: IssueTypeMeta[]) {
  (useIssueTypes as ReturnType<typeof vi.fn>).mockReturnValue({
    types: data,
    byKey: new Map(data.map((t) => [t.key, t])),
    isLoading: false,
  });
}

function renderSection() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <IssueTypesSettingsSection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('任务类型管理面（CAP-A-04 增强 / GAP-T-25）', () => {
  beforeEach(() => {
    updateMock.mockClear();
    createMock.mockClear();
  });

  it('类型列表渲染统计行（描述 + 状态·字段·任务计数）', () => {
    mockTypes([taskType, storyType]);
    renderSection();
    expect(screen.getByText('任务')).toBeInTheDocument();
    expect(screen.getByText('跟踪通用任务和后续任务')).toBeInTheDocument();
    // story 无描述：统计行直接承载计数（mock 全局状态 1 条 → 1 个状态）
    expect(screen.getByText('1 个状态 · 1 个自定义字段 · 0 个任务')).toBeInTheDocument();
  });

  it('默认类型 task 的启用开关禁用，自定义类型可停用并落库', () => {
    mockTypes([taskType, storyType]);
    renderSection();
    const switches = screen.getAllByRole('switch');
    // 第一行为 task（data-disabled = base-ui 禁用态），第二行 story 可交互
    expect(switches[0]).toHaveAttribute('data-disabled');
    expect(switches[1]).not.toHaveAttribute('data-disabled');
    fireEvent.click(switches[1]);
    expect(updateMock).toHaveBeenCalledWith({
      id: 'type-story',
      data: { enabled: false },
    });
  });

  it('推荐库对已存在 key 显示已添加且不可再添加', () => {
    mockTypes([taskType, storyType]);
    renderSection();
    // 10 个推荐项，story 已存在 → 9 个可添加、1 个已添加
    const addButtons = screen.getAllByRole('button', { name: '添加' });
    expect(addButtons.length).toBe(9);
    for (const btn of addButtons) expect(btn).toBeEnabled();
    const addedButtons = screen.getAllByRole('button', { name: '已添加' });
    expect(addedButtons.length).toBe(1);
    expect(addedButtons[0]).toBeDisabled();
  });

  it('推荐库一键添加携带 i18n 名称与预设图标颜色', async () => {
    mockTypes([taskType]);
    renderSection();
    const addButtons = screen.getAllByRole('button', { name: '添加' });
    fireEvent.click(addButtons[0]);
    await waitFor(() => {
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'requirement', icon: 'FileText' }),
      );
    });
  });
});

