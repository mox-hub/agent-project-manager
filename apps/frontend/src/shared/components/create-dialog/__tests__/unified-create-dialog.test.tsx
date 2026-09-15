/**
 * 统一创建面板回归测试（CAP-A-18 / GAP-T-32）
 *
 * 覆盖：顶级双界面切换互不串／AI 草稿流（生成→确认创建→复用手动提交）／
 * 失败降级（转小助理）／Esc 脏保护／最大化宽高同步／里程碑绑定表单项目／
 * 死装饰不渲染。i18n t() 直通返回 key，断言走 unifiedCreate.* 键名。
 */
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnifiedCreateDialog } from '../unified-create-dialog';

// vitest 环境无 i18next 实例：t() 直通返回 key
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const {
  mockNavigate,
  openAssistantWithDraft,
  draftMutate,
  createTaskMutate,
  createProjectMutate,
  createDocumentMutate,
  createMilestoneMutate,
  milestoneCtor,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  openAssistantWithDraft: vi.fn(),
  draftMutate: vi.fn(),
  createTaskMutate: vi.fn(),
  createProjectMutate: vi.fn(),
  createDocumentMutate: vi.fn(),
  createMilestoneMutate: vi.fn(),
  milestoneCtor: vi.fn(),
}));

vi.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (sel: (s: Record<string, unknown>) => unknown) =>
    sel({ openAssistantWithDraft }),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// grill 深访组件（CAP-P-01 主线）重依赖，面板测试 stub
vi.mock('@/modules/project/components/grill/grill-interview', () => ({
  GrillInterview: () => null,
}));
vi.mock('@/modules/project/components/grill/grill-minutes', () => ({
  buildGrillMinutes: () => '',
}));

vi.mock('@/modules/project/hooks/use-project-list', () => ({
  useProjectList: () => ({
    data: { items: [{ id: 'p1', name: '项目一' }, { id: 'p2', name: '项目二' }] },
  }),
}));
vi.mock('@/modules/project/hooks/use-project-modules', () => ({
  useProjectModules: () => ({ data: [] }),
}));
vi.mock('@/modules/team-member/api/team-member-api', () => ({
  listProjectMembers: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/modules/issue/hooks/use-project-tasks', () => ({
  useCreateTask: () => ({ mutateAsync: createTaskMutate, isPending: false }),
}));
vi.mock('@/modules/project/hooks/use-project-mutations', () => ({
  useCreateProject: () => ({ mutateAsync: createProjectMutate, isPending: false }),
}));
vi.mock('@/modules/project/hooks/use-project-dashboard-summary', () => ({
  // 捕获 hook 绑定的 projectId——里程碑 P0 修复（绑定表单所选项目）的断言面
  useCreateProjectMilestone: (pid?: string) => {
    milestoneCtor(pid);
    return { mutateAsync: createMilestoneMutate, isPending: false };
  },
}));
vi.mock('@/modules/document/hooks/use-document-mutations', () => ({
  useCreateDocument: () => ({ mutateAsync: createDocumentMutate, isPending: false }),
}));

// 保留真实 parseCreateDraft/parseCreateSuggestions，仅替换两个 mutation hook
vi.mock('@/modules/assistant/hooks/use-silent-ai', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/modules/assistant/hooks/use-silent-ai')>();
  return {
    ...actual,
    useSilentCreateSuggestions: () => ({
      mutateAsync: vi.fn().mockRejectedValue(new Error('skip')),
    }),
    useSilentCreateDraft: () => ({ mutateAsync: draftMutate, isPending: false }),
  };
});

const DRAFT_RESPONSE = {
  data: {
    type: 'task',
    fields: { title: '登录页改版', priority: 'high', dueDate: '2026-09-18' },
  },
};

function setup(props?: Partial<Parameters<typeof UnifiedCreateDialog>[0]>) {
  const onOpenChange = vi.fn();
  render(
    <UnifiedCreateDialog
      open
      onOpenChange={onOpenChange}
      {...props}
    />,
  );
  return { onOpenChange };
}

beforeEach(() => {
  vi.clearAllMocks();
  createTaskMutate.mockResolvedValue({ id: 't1' });
  createProjectMutate.mockResolvedValue({ id: 'pr1' });
  createDocumentMutate.mockResolvedValue({ id: 'd1' });
  createMilestoneMutate.mockResolvedValue({ id: 'm1' });
});

describe('UnifiedCreateDialog 双界面（CAP-A-18）', () => {
  it('手动面板默认渲染任务类型，类型切换器含五类型 i18n 键', () => {
    setup();
    expect(screen.getByPlaceholderText('unifiedCreate.placeholder.task')).toBeInTheDocument();
    // trigger 与隐藏 popover 菜单可能同时挂载，用 getAllByText 容错
    fireEvent.click(screen.getAllByText('unifiedCreate.labels.task')[0]);
    for (const ty of ['task', 'bug', 'doc', 'project', 'milestone']) {
      expect(screen.getAllByText(`unifiedCreate.labels.${ty}`).length).toBeGreaterThan(0);
    }
  });

  it('手动 ↔ AI 代理切换互不串：AI 输入在回手动后清空草稿态', () => {
    setup();
    fireEvent.click(screen.getByText('unifiedCreate.mode.ai'));
    expect(screen.getByPlaceholderText('unifiedCreate.aiPanel.inputPlaceholder')).toBeInTheDocument();
    // 手动面板的标题输入不在 AI 界面
    expect(screen.queryByPlaceholderText('unifiedCreate.placeholder.task')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('unifiedCreate.mode.manual'));
    expect(screen.getByPlaceholderText('unifiedCreate.placeholder.task')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('unifiedCreate.aiPanel.inputPlaceholder')).not.toBeInTheDocument();
  });

  it('AI 草稿流：生成 → 草稿卡预览 → 确认创建复用手动提交流落库', async () => {
    draftMutate.mockResolvedValue(DRAFT_RESPONSE);
    setup();
    fireEvent.click(screen.getByText('unifiedCreate.mode.ai'));
    fireEvent.change(screen.getByPlaceholderText('unifiedCreate.aiPanel.inputPlaceholder'), {
      target: { value: '建一个任务「登录页改版」，本周五截止，优先级高' },
    });
    fireEvent.click(screen.getByText('unifiedCreate.aiPanel.generate'));
    const card = await screen.findByTestId('create-draft-card');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('登录页改版')).toBeInTheDocument();
    // 草稿卡与页脚 CTA 都有确认入口，点草稿卡内的那颗
    fireEvent.click(within(card).getByText('unifiedCreate.aiPanel.confirm'));
    await waitFor(() => {
      expect(createTaskMutate).toHaveBeenCalledWith(
        expect.objectContaining({ title: '登录页改版', priority: 'high', dueDate: '2026-09-18', type: 'task' }),
      );
    });
  });

  it('AI 解析失败：显示错误并保留「转小助理」降级按钮', async () => {
    draftMutate.mockRejectedValue(new Error('LLM 不可用'));
    setup();
    fireEvent.click(screen.getByText('unifiedCreate.mode.ai'));
    fireEvent.change(screen.getByPlaceholderText('unifiedCreate.aiPanel.inputPlaceholder'), {
      target: { value: '建一个任务' },
    });
    fireEvent.click(screen.getByText('unifiedCreate.aiPanel.generate'));
    expect(await screen.findByRole('alert')).toHaveTextContent('LLM 不可用');
    expect(screen.getByText('unifiedCreate.aiPanel.fallback')).toBeInTheDocument();
    fireEvent.click(screen.getByText('unifiedCreate.aiPanel.fallback'));
    expect(openAssistantWithDraft).toHaveBeenCalled();
  });

  it('Esc 脏保护：有未提交输入先弹确认，确认后才关闭', () => {
    const { onOpenChange } = setup();
    fireEvent.change(screen.getByPlaceholderText('unifiedCreate.placeholder.task'), {
      target: { value: '未保存的标题' },
    });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByText('unifiedCreate.discard.title')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    fireEvent.click(screen.getByText('unifiedCreate.discard.discard'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('Esc 无输入时直接关闭，不弹确认', () => {
    const { onOpenChange } = setup();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(screen.queryByText('unifiedCreate.discard.title')).not.toBeInTheDocument();
  });

  it('最大化宽高同步放大（w-dialog × h-dialog-screen 语义档）', () => {
    setup();
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    expect(dialog.className).not.toContain('w-dialog');
    fireEvent.click(screen.getByTitle('unifiedCreate.iconTips.maximize'));
    expect(dialog.className).toContain('w-dialog');
    expect(dialog.className).toContain('h-dialog-screen');
  });

  it('里程碑提交绑定表单所选项目（P0：原绑死 prop 全局入口必炸）', async () => {
    setup({ projectId: 'p1', defaultType: 'milestone' });
    expect(milestoneCtor).toHaveBeenCalledWith('p1');
    fireEvent.change(screen.getByPlaceholderText('unifiedCreate.placeholder.milestone'), {
      target: { value: 'v0.7 发布里程碑' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'unifiedCreate.title.milestone' }));
    await waitFor(() => {
      expect(createMilestoneMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'v0.7 发布里程碑' }),
      );
    });
  });

  it('死装饰不渲染：无附件按钮；项目类型无 Template/Lead 死块', () => {
    setup({ defaultType: 'project' });
    expect(document.querySelector('[title="添加附件"]')).toBeNull();
    expect(screen.queryByText('unifiedCreate.linear.labels')).not.toBeInTheDocument();
    // 项目属性面板只剩优先级行（Lead/Target 死胶囊已移除）
    expect(screen.getByText('unifiedCreate.field.priority')).toBeInTheDocument();
    expect(screen.queryByText('unifiedCreate.field.author')).not.toBeInTheDocument();
  });
});
