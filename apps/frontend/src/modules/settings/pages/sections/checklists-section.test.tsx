import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ChecklistsSettingsSection } from './checklists-section';
import type { CompletenessChecklist } from '@/modules/acceptance/api/acceptance-api';

// placeholder 定位用的键→文案映射（i18n mock 仅透传键名）
const MOCK_PLACEHOLDER_TEXTS: Record<string, string> = {
  'settings.checklistsNamePlaceholder': '如：Web 前端交付清单',
  'settings.checklistItemCategory': '分类占位',
  'settings.checklistItemContent': '内容占位',
};

function mockT(key: string, opts?: Record<string, unknown>) {
  if (key === 'settings.checklistsItemsCount') return `${opts?.count} 项`;
  return MOCK_PLACEHOLDER_TEXTS[key] ?? key;
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: mockT }),
}));

// PageShell 内嵌 PageHeader（依赖 app-store 收藏状态），测试仅关注卡片内容
vi.mock('@/components/ui/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/modules/auth/hooks/use-auth', () => ({
  useAuth: () => ({ currentUser: { id: 'u1' } }),
}));

const confirmMock = vi.fn().mockResolvedValue(true);
vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => confirmMock,
}));

const createMock = vi.fn().mockResolvedValue({});
const updateMock = vi.fn().mockResolvedValue({});
const deleteMock = vi.fn().mockResolvedValue(undefined);

vi.mock('@/modules/acceptance/hooks/use-acceptance', () => ({
  useChecklists: vi.fn(),
  useCreateChecklist: () => ({ mutateAsync: createMock, isPending: false }),
  useUpdateChecklist: () => ({ mutateAsync: updateMock, isPending: false }),
  useDeleteChecklist: () => ({ mutateAsync: deleteMock, isPending: false }),
}));

import { useChecklists } from '@/modules/acceptance/hooks/use-acceptance';

const systemChecklist: CompletenessChecklist = {
  id: 'sys-1',
  name: '通用工程清单',
  projectType: 'backend',
  techStack: 'ts-node',
  isSystem: true,
  checklist: [
    { category: '日志', content: '是否定义了日志方案', severity: 'high' },
    { category: '测试', content: '是否有测试计划', severity: 'medium' },
  ],
  version: 1,
};

const teamChecklist: CompletenessChecklist = {
  id: 'team-1',
  name: '我的前端清单',
  projectType: 'frontend',
  techStack: 'react',
  isSystem: false,
  ownerId: 'u1',
  checklist: [{ category: '可访问性', content: '焦点环是否可见', severity: 'low' }],
  version: 2,
};

function mockChecklists(data: CompletenessChecklist[]) {
  (useChecklists as ReturnType<typeof vi.fn>).mockReturnValue({ data, isLoading: false });
}

function renderSection() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <ChecklistsSettingsSection />
    </QueryClientProvider>,
  );
}

/**
 * 语义锚点定位清单行：以「清单名称」文本为锚，向上取最近的卡片壳
 * （`data-slot="card"`，Card 组件的公开契约）。
 *
 * 此前用的是类选择器 `.rounded-lg.border.bg-card`——那是「以实现细节当契约」：
 * 壳的 class 串一改（哪怕可见效果逐像素不变）断言就红，反过来也逼着迁移者为了过测试
 * 而保留旧 class。改锚到语义后，断言只依赖「一行清单 = 一张以名称标识的卡片」这一事实。
 */
function rowFor(name: string): HTMLElement {
  const row = screen.getByText(name).closest('[data-slot="card"]');
  if (!row) throw new Error(`未找到清单「${name}」所在的行卡片`);
  return row as HTMLElement;
}

describe('ChecklistsSettingsSection', () => {
  beforeEach(() => {
    // mockClear 只清调用记录、保留 mockResolvedValue 实现
    createMock.mockClear();
    updateMock.mockClear();
    deleteMock.mockClear();
    confirmMock.mockClear();
  });

  it('系统组与团队组分组渲染：名称/项目类型徽标/项数', () => {
    mockChecklists([systemChecklist, teamChecklist]);
    renderSection();

    expect(screen.getByText('settings.checklistsSystemGroup')).toBeTruthy();
    expect(screen.getByText('settings.checklistsTeamGroup')).toBeTruthy();
    expect(screen.getByText('通用工程清单')).toBeTruthy();
    expect(screen.getByText('我的前端清单')).toBeTruthy();
    expect(screen.getByText('2 项')).toBeTruthy();
    expect(screen.getByText('backend')).toBeTruthy();
    expect(screen.getByText('react')).toBeTruthy();
  });

  it('系统清单只读（无编辑/删除按钮），自己的团队清单可编辑删除', () => {
    mockChecklists([systemChecklist, teamChecklist]);
    renderSection();

    const sysRow = rowFor('通用工程清单');
    const teamRow = rowFor('我的前端清单');
    // 两行各自独立成卡（systemChecklist 与 teamChecklist 未被合并到同一壳里）
    expect(sysRow).not.toBe(teamRow);

    expect(sysRow.querySelector('[data-svg-src], svg') ?? null).toBeTruthy();
    // 系统行没有编辑/删除操作按钮
    expect(within(sysRow).queryAllByRole('button')).toHaveLength(0);
    // 团队行有两个操作按钮（编辑/删除）
    expect(within(teamRow).queryAllByRole('button')).toHaveLength(2);
  });

  it('创建对话框：填写名称与技术栈后保存，携带 projectType/checklist 落库', async () => {
    mockChecklists([]);
    renderSection();

    fireEvent.click(screen.getByText('settings.checklistsCreate'));
    // 打开对话框（标题切换为创建态）
    await waitFor(() => expect(screen.getAllByText('settings.checklistsCreate').length).toBeGreaterThan(1));

    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const inputs = Array.from(dialog.querySelectorAll('input')) as HTMLInputElement[];
    const byPlaceholder = (text: string) =>
      inputs.find((i) => i.placeholder === text) as HTMLInputElement;
    fireEvent.change(byPlaceholder('如：Web 前端交付清单'), { target: { value: '新清单' } });
    const techInput = inputs.find((i) => i.className.includes('font-mono')) as HTMLInputElement;
    fireEvent.change(techInput, { target: { value: 'go-gin' } });
    fireEvent.change(byPlaceholder('内容占位'), { target: { value: '是否定义了日志方案' } });

    fireEvent.click(screen.getByText('common.save'));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const payload = createMock.mock.calls[0][0];
    expect(payload.name).toBe('新清单');
    expect(payload.techStack).toBe('go-gin');
    expect(payload.projectType).toBe('backend');
    expect(payload.checklist).toHaveLength(1);
    expect(payload.checklist[0].content).toBe('是否定义了日志方案');
  });

  it('校验拦截：名称为空时保存被拒绝且不触达 mutation', async () => {
    mockChecklists([]);
    renderSection();

    fireEvent.click(screen.getByText('settings.checklistsCreate'));
    await waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());

    fireEvent.click(screen.getByText('common.save'));
    await waitFor(() => expect(createMock).not.toHaveBeenCalled());
  });

  it('删除走确认框后触达 mutation', async () => {
    mockChecklists([teamChecklist]);
    renderSection();

    const row = rowFor('我的前端清单');
    const buttons = within(row).getAllByRole('button');
    fireEvent.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(confirmMock).toHaveBeenCalled());
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith('team-1'));
  });
});
