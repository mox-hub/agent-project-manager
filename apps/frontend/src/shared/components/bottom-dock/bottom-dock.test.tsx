import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DOCK_ITEM_IDS, useAppStore, type DockItemId } from '@/infrastructure/store/app-store';
import { BottomDock } from './bottom-dock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// useTheme 需 ThemeProvider；本测试只关心 Dock 行为，直接注入固定主题
vi.mock('@/shared/theme/theme-context', () => ({
  useTheme: () => ({ mode: 'light', toggleTheme: vi.fn() }),
}));

// Dock 现在只用到 useNavigate（路由由测试直接断言其未被调用）
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));

// AI 同事清单由 office/assistant 查询驱动，此处注入固定清单
const { COLLEAGUES } = vi.hoisted(() => ({
  COLLEAGUES: [
    {
      id: 'assistant',
      name: '主协同助手',
      title: '主协同助手',
      avatarUrl: null,
      icon: () => null,
      color: 'text-accent-purple',
      bgColor: 'bg-accent-purple-light',
      status: 'idle',
      placeholder: '向主协同助手提问或安排任务...',
    },
    {
      id: 'm-2',
      name: '验收审计员',
      title: '门禁与契约审计',
      avatarUrl: null,
      icon: () => null,
      color: 'text-accent-green',
      bgColor: 'bg-accent-green-light',
      status: 'idle',
      placeholder: '向 [验收审计员] 提问或安排任务...',
    },
  ],
}));

vi.mock('./use-dock-ai-colleagues', () => ({
  STATUS_DOT_CLASS: { idle: 'bg-accent-green' },
  useDockAiColleagues: () => ({ colleagues: COLLEAGUES, activeProjectId: undefined }),
}));

vi.mock('@/modules/notification/hooks/use-notifications', () => ({
  useUnreadNotificationsCount: () => ({ data: 0 }),
}));

// 身份 Popover 与成本徽章各自有独立数据源，本测试不涉及
vi.mock('./dock-user-popover', () => ({ DockUserPopover: () => <div /> }));
vi.mock('./dock-metric-badge', () => ({ DockMetricBadge: () => null }));

const DEFAULT_STORE = {
  aiPanelOpen: true,
  dockItems: [...DOCK_ITEM_IDS],
  dockHiddenAssistantIds: [] as string[],
};

/** 渲染「对话浮窗（含决策侧栏）+ Dock」——模拟真实的同屏结构 */
function renderDock() {
  return render(
    <>
      <div data-ai-component="assistant.fab-window" data-testid="assistant-window">
        <div data-ai-component="assistant.decision-wing">
          <button type="button" data-ai-action="assistant.decision.collapse.click">
            收起决策侧栏
          </button>
        </div>
      </div>
      <BottomDock />
    </>,
  );
}

/** 展开 Dock 的 Prompt 输入栏（会同时打开 AI 对话面板） */
function openPromptBar() {
  fireEvent.click(screen.getByTitle('点击呼出 AI 快捷指令栏与对话面板'));
}

function renderedDockItemIds(): string[] {
  return screen
    .queryAllByTestId(/^dock-item-/)
    .map((el) => el.getAttribute('data-testid') ?? '');
}

beforeEach(() => {
  useAppStore.setState({ ...DEFAULT_STORE, createDialog: { open: false, type: 'task' } });
  navigateMock.mockClear();
});

describe('BottomDock —— 新建入口（回归 CAP-A-13）', () => {
  it('点击「新建」唤起全局统一创建面板（默认 task 类型），且不再跳转工单列表页', () => {
    renderDock();
    expect(useAppStore.getState().createDialog.open).toBe(false);

    fireEvent.click(screen.getByTestId('dock-item-create'));

    expect(useAppStore.getState().createDialog).toMatchObject({ open: true, type: 'task' });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});

describe('BottomDock —— 退出判定区域（回归：点弹窗内部不得关闭弹窗）', () => {
  it('Prompt 栏展开时，点 AI 对话面板内部不关闭面板', () => {
    renderDock();
    openPromptBar();
    expect(useAppStore.getState().aiPanelOpen).toBe(true);

    fireEvent.mouseDown(screen.getByTestId('assistant-window'));

    expect(useAppStore.getState().aiPanelOpen).toBe(true);
  });

  it('点决策侧栏的「收起」按钮不关闭主窗口（侧栏关闭与主窗口关闭解耦）', () => {
    renderDock();
    openPromptBar();

    fireEvent.mouseDown(screen.getByText('收起决策侧栏'));

    expect(useAppStore.getState().aiPanelOpen).toBe(true);
  });

  it('点面板内部的 Portal 浮层（如模型选择器）不关闭面板', () => {
    renderDock();
    openPromptBar();

    const popover = document.createElement('div');
    popover.setAttribute('data-slot', 'popover-content');
    document.body.appendChild(popover);
    fireEvent.mouseDown(popover);

    expect(useAppStore.getState().aiPanelOpen).toBe(true);
    popover.remove();
  });

  it('点击 Dock 自身（同一交互面）不关闭面板', () => {
    renderDock();
    openPromptBar();

    fireEvent.mouseDown(screen.getByTestId('dock-item-search'));

    expect(useAppStore.getState().aiPanelOpen).toBe(true);
  });

  it('点击交互面之外的区域：收起输入栏并关闭对话面板', () => {
    renderDock();
    openPromptBar();

    fireEvent.mouseDown(document.body);

    // 关闭由 Dock 的 outside-click 处理器触发，前提是 Prompt 栏已展开（处理器才挂载）
    expect(useAppStore.getState().aiPanelOpen).toBe(false);
  });
});

describe('BottomDock —— 配置驱动渲染（CAP-A-13 Dock 自定义）', () => {
  it('默认渲染全部功能按钮，且顺序为 新建→搜索→通知→主题', () => {
    renderDock();
    expect(renderedDockItemIds()).toEqual(
      DOCK_ITEM_IDS.map((id: DockItemId) => `dock-item-${id}`),
    );
  });

  it('隐藏的功能按钮不渲染', () => {
    renderDock();
    act(() => {
      useAppStore.getState().setDockItemVisible('notifications', false);
    });
    expect(screen.queryByTestId('dock-item-notifications')).toBeNull();
    expect(screen.getByTestId('dock-item-create')).toBeTruthy();
  });

  it('自定义顺序按 store 中的数组顺序渲染', () => {
    useAppStore.setState({ dockItems: ['theme', 'create'] });
    renderDock();
    expect(renderedDockItemIds()).toEqual(['dock-item-theme', 'dock-item-create']);
  });

  it('被设为不展示的 AI 同事不出现在 Dock 头像群', () => {
    useAppStore.setState({ dockHiddenAssistantIds: ['m-2'] });
    renderDock();

    expect(screen.queryByTitle(/验收审计员/)).toBeNull();
    expect(screen.getByTitle(/主协同助手/)).toBeTruthy();
  });
});
