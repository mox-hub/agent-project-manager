import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DOCK_ITEM_IDS, useAppStore } from '@/infrastructure/store/app-store';
import { DockSettingsSection } from './dock-section';

// base-ui Switch 点击路径依赖 window.PointerEvent（jsdom 缺失）
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

// i18n mock 仅透传键名，断言直接对着键写
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// PageShell 内嵌 PageHeader（依赖收藏/标签页上下文），本测试只关注设置卡片内容
vi.mock('@/components/ui/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// 故意乱序（默认助手排在后面），用来验证卡片会把默认助手提到首位
const { COLLEAGUES } = vi.hoisted(() => ({
  COLLEAGUES: [
    {
      id: 'm-2',
      name: '验收审计员',
      title: '门禁与契约审计',
      avatarUrl: null,
      status: 'idle',
      placeholder: '向 [验收审计员] 提问...',
      isMain: false,
    },
    {
      id: 'assistant',
      name: '小周',
      title: '项目管理搭档',
      avatarUrl: null,
      status: 'idle',
      placeholder: '向小周提问...',
      isMain: true,
    },
  ],
}));

vi.mock('@/shared/components/bottom-dock/use-dock-ai-colleagues', () => ({
  useDockAiColleagues: () => ({ colleagues: COLLEAGUES, activeProjectId: undefined }),
}));

// 预览卡片内嵌的是真实 Dock（自带通知/身份 Popover/主题等数据源），
// 其行为由 bottom-dock.test 覆盖，这里只验证预览卡片把它以 preview 态挂上
vi.mock('@/shared/components/bottom-dock', () => ({
  BottomDock: ({ preview }: { preview?: boolean }) => (
    <div data-testid="dock-preview" data-preview={String(Boolean(preview))} />
  ),
}));

// 面板本体（统一创建对话框）依赖大量表单与查询，本测试不涉及
vi.mock('@/shared/components/global-create-dialog', () => ({
  GlobalCreateDialog: () => <div data-testid="global-create-dialog" />,
}));

beforeEach(() => {
  useAppStore.setState({
    dockItems: [...DOCK_ITEM_IDS],
    dockHiddenAssistantIds: [],
    dockAlwaysVisible: false,
  });
});

describe('DockSettingsSection —— 顶部实时预览', () => {
  it('置顶渲染完整 Dock 栏预览卡片（以 preview 态挂载真实 Dock）', () => {
    render(<DockSettingsSection />);

    const preview = screen.getByTestId('dock-preview');
    expect(preview.getAttribute('data-preview')).toBe('true');
    expect(screen.getByText('settings.dockPreviewTitle')).toBeTruthy();
  });

  it('预览卡片位于配置卡片之前（DOM 顺序）', () => {
    render(<DockSettingsSection />);

    const preview = screen.getByTestId('dock-preview');
    const actionsTitle = screen.getByText('settings.dockActionsTitle');

    // actionsTitle 在 preview 之后
    expect(
      preview.compareDocumentPosition(actionsTitle) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('DockSettingsSection —— 显示方式（常驻开关）', () => {
  it('默认关闭常驻（Dock 自动隐藏）', () => {
    render(<DockSettingsSection />);
    expect(useAppStore.getState().dockAlwaysVisible).toBe(false);
  });

  it('切换开关写入常驻状态', () => {
    render(<DockSettingsSection />);

    fireEvent.click(screen.getByTestId('dock-always-visible'));
    expect(useAppStore.getState().dockAlwaysVisible).toBe(true);

    fireEvent.click(screen.getByTestId('dock-always-visible'));
    expect(useAppStore.getState().dockAlwaysVisible).toBe(false);
  });

  it('「恢复默认」把常驻开关一并还原为关闭', () => {
    useAppStore.setState({ dockAlwaysVisible: true });
    render(<DockSettingsSection />);

    fireEvent.click(screen.getByTestId('dock-reset'));

    expect(useAppStore.getState().dockAlwaysVisible).toBe(false);
  });
});

describe('DockSettingsSection —— 功能按钮显隐与排序', () => {
  it('渲染全部可选功能项，默认全部开启', () => {
    render(<DockSettingsSection />);

    for (const id of DOCK_ITEM_IDS) {
      expect(screen.getByTestId(`dock-visible-${id}`)).toBeTruthy();
    }
    expect(useAppStore.getState().dockItems).toEqual([...DOCK_ITEM_IDS]);
  });

  it('关闭开关后该功能从 Dock 配置中移除', () => {
    render(<DockSettingsSection />);

    fireEvent.click(screen.getByTestId('dock-visible-notifications'));

    expect(useAppStore.getState().dockItems).not.toContain('notifications');
    expect(useAppStore.getState().dockItems).toContain('create');
  });

  it('重新开启后该功能追加回列表末尾', () => {
    render(<DockSettingsSection />);

    fireEvent.click(screen.getByTestId('dock-visible-notifications'));
    expect(useAppStore.getState().dockItems).not.toContain('notifications');
    fireEvent.click(screen.getByTestId('dock-visible-notifications'));

    expect(useAppStore.getState().dockItems).toEqual([
      'create',
      'search',
      'theme',
      'notifications',
    ]);
  });

  it('上移/下移在可见列表内交换位置', () => {
    render(<DockSettingsSection />);

    fireEvent.click(screen.getByTestId('dock-move-down-create'));

    expect(useAppStore.getState().dockItems).toEqual([
      'search',
      'create',
      'notifications',
      'theme',
    ]);
  });

  it('首个项的上移按钮禁用（不能越界）', () => {
    render(<DockSettingsSection />);
    const upFirst = screen.getByTestId('dock-move-up-create') as HTMLButtonElement;
    expect(upFirst.disabled).toBe(true);
  });

  it('「恢复默认」还原功能项与 AI 常驻配置', () => {
    useAppStore.setState({ dockItems: ['theme'], dockHiddenAssistantIds: ['m-2'] });
    render(<DockSettingsSection />);

    fireEvent.click(screen.getByTestId('dock-reset'));

    expect(useAppStore.getState().dockItems).toEqual([...DOCK_ITEM_IDS]);
    expect(useAppStore.getState().dockHiddenAssistantIds).toEqual([]);
  });
});

describe('DockSettingsSection —— 常驻 AI 助手', () => {
  it('列出 AI 同事，默认全部常驻', () => {
    render(<DockSettingsSection />);

    expect(screen.getByTestId('dock-ai-visible-assistant')).toBeTruthy();
    expect(screen.getByTestId('dock-ai-visible-m-2')).toBeTruthy();
    expect(screen.getAllByText('验收审计员').length).toBeGreaterThan(0);
    expect(useAppStore.getState().dockHiddenAssistantIds).toEqual([]);
  });

  it('取消勾选后加入隐藏名单，可用「全部展示」一键还原', () => {
    render(<DockSettingsSection />);

    fireEvent.click(screen.getByTestId('dock-ai-visible-m-2'));
    expect(useAppStore.getState().dockHiddenAssistantIds).toEqual(['m-2']);

    fireEvent.click(screen.getByTestId('dock-ai-show-all'));
    expect(useAppStore.getState().dockHiddenAssistantIds).toEqual([]);
  });

  it('无勾选遗漏时（全部常驻）不渲染「全部展示」按钮', () => {
    render(<DockSettingsSection />);
    expect(screen.queryByTestId('dock-ai-show-all')).toBeNull();
  });

  it('默认助手（小周）固定排在第一位，即使数据源里它靠后', () => {
    render(<DockSettingsSection />);

    // 按 DOM 顺序取「常驻 AI 助手」各行的开关（页面另有功能按钮列表，不能按 li 序号取）
    const orderedIds = screen
      .getAllByTestId(/^dock-ai-visible-/)
      .map((el) => el.getAttribute('data-testid'));
    expect(orderedIds).toEqual(['dock-ai-visible-assistant', 'dock-ai-visible-m-2']);
  });

  it('默认助手不可关闭：开关禁用且恒为开启，并带「默认」标记', () => {
    render(<DockSettingsSection />);

    // base-ui 的 Switch 渲染为 <span role="switch">，禁用态标记是 aria-disabled/data-disabled
    const mainSwitch = screen.getByTestId('dock-ai-visible-assistant');
    expect(mainSwitch.getAttribute('aria-disabled')).toBe('true');
    expect(mainSwitch.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('dock-ai-default-badge-assistant')).toBeTruthy();
  });

  it('其余同事的开关不受影响，仍可正常关闭', () => {
    render(<DockSettingsSection />);

    const otherSwitch = screen.getByTestId('dock-ai-visible-m-2');
    expect(otherSwitch.getAttribute('aria-disabled')).toBeNull();

    fireEvent.click(otherSwitch);
    expect(useAppStore.getState().dockHiddenAssistantIds).toEqual(['m-2']);
  });

  it('即便默认助手的 id 混进隐藏名单，它仍显示为已常驻', () => {
    useAppStore.setState({ dockHiddenAssistantIds: ['assistant'] });
    render(<DockSettingsSection />);

    const mainSwitch = screen.getByTestId('dock-ai-visible-assistant');
    expect(mainSwitch.getAttribute('aria-checked')).toBe('true');
  });
});
