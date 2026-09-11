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
const { COLLEAGUES, AUDITOR_AVATAR_URL } = vi.hoisted(() => {
  const AUDITOR_AVATAR_URL = 'https://cdn.example.com/auditor.png';
  return {
    AUDITOR_AVATAR_URL,
    COLLEAGUES: [
      {
        id: 'assistant',
        name: '小周',
        title: '项目管理搭档',
        // 无真实头像 → 走双表面生成式头像
        avatarUrl: null,
        status: 'idle',
        placeholder: '向小周提问或安排任务...',
        isMain: true,
      },
      {
        id: 'm-2',
        name: '验收审计员',
        title: '门禁与契约审计',
        // 成员信息里有真实头像
        avatarUrl: AUDITOR_AVATAR_URL,
        status: 'idle',
        placeholder: '向 [验收审计员] 提问或安排任务...',
        isMain: false,
      },
    ],
  };
});

vi.mock('./use-dock-ai-colleagues', () => ({
  STATUS_DOT_CLASS: { idle: 'bg-accent-green' },
  useDockAiColleagues: () => ({ colleagues: COLLEAGUES, activeProjectId: undefined }),
}));

vi.mock('@/modules/notification/hooks/use-notifications', () => ({
  useUnreadNotificationsCount: () => ({ data: 0 }),
}));

// 身份 Popover 各自有独立数据源，本测试不涉及
vi.mock('./dock-user-popover', () => ({ DockUserPopover: () => <div /> }));

// 徽章栏：暴露 collapsed 契约（收尾态应贴底），并证明它始终在 DOM 中
vi.mock('./dock-metric-badge', () => ({
  DockMetricBadge: ({ collapsed }: { collapsed?: boolean }) => (
    <div data-testid="dock-badge" data-collapsed={String(Boolean(collapsed))} />
  ),
}));

const DEFAULT_STORE = {
  aiPanelOpen: true,
  dockItems: [...DOCK_ITEM_IDS],
  dockHiddenAssistantIds: [] as string[],
  dockAlwaysVisible: false,
};

/** 渲染「对话浮窗（含决策侧栏）+ Dock」——模拟真实的同屏结构 */
function renderDock(options?: { preview?: boolean }) {
  return render(
    <>
      <div data-ai-component="assistant.fab-window" data-testid="assistant-window">
        <div data-ai-component="assistant.decision-wing">
          <button type="button" data-ai-action="assistant.decision.collapse.click">
            收起决策侧栏
          </button>
        </div>
      </div>
      <BottomDock preview={options?.preview} />
    </>,
  );
}

/** Dock 当前是否浮出（根节点上的状态属性） */
function dockVisibleAttr(): string | null {
  return document.querySelector('[data-dock-root]')?.getAttribute('data-dock-visible') ?? null;
}

/**
 * 靠近区域按 Dock 的包围盒算，而 jsdom 的 getBoundingClientRect 被全局 stub 成 800×400，
 * 故这里按「视口底部居中」的真实位置改写根节点包围盒（jsdom 视口高 768）。
 */
function stubDockRect({ top = 700, left = 300, width = 200 } = {}) {
  const root = document.querySelector('[data-dock-root]') as HTMLElement;
  // 原型上的 getBoundingClientRect 是不可写数据属性，只能另定义自有属性覆盖它
  Object.defineProperty(root, 'getBoundingClientRect', {
    configurable: true,
    value: () =>
      ({
        top,
        bottom: top + 48,
        left,
        right: left + width,
        width,
        height: 48,
        x: left,
        y: top,
        toJSON: () => ({}),
      }) as DOMRect,
  });
}

function moveMouseTo(x: number, y: number) {
  fireEvent.mouseMove(document, { clientX: x, clientY: y });
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

    // 用头像按钮的专属 title 定位（内层 MemberAvatar 自己也有同名 title）
    expect(screen.queryByTitle(/点击向 \[验收审计员\]/)).toBeNull();
    expect(screen.getByTitle(/点击向 \[小周\]/)).toBeTruthy();
  });

  it('默认助手（小周）不受隐藏名单影响，始终在 Dock 头像群中', () => {
    // 即便其 id 被写进隐藏名单（存量脏数据/名字变更后残留），也不该消失
    useAppStore.setState({ dockHiddenAssistantIds: ['assistant'] });
    renderDock();

    expect(screen.getByTitle(/点击向 \[小周\]/)).toBeTruthy();
  });
});

describe('BottomDock —— 助手头像取自成员信息', () => {
  it('成员信息里有真实头像的同事，Dock 上渲染真实图片', () => {
    renderDock();

    expect(
      document.querySelector(`img[src="${AUDITOR_AVATAR_URL}"]`),
    ).not.toBeNull();
  });

  it('没有真实头像的同事不渲染 <img>，也不回落到通用图标（走双表面生成式头像）', () => {
    renderDock();

    const mainBtn = screen.getByTitle(/点击向 \[小周\]/);
    // 无真实头像 → 不出 <img>
    expect(mainBtn.querySelector('img')).toBeNull();
    // 但也不该是 lucide 通用图标（svg.lucide 是 lucide 的标记），而是生成式头像
    expect(mainBtn.querySelector('svg.lucide')).toBeNull();
    expect(mainBtn.querySelector('svg')).not.toBeNull();
  });

  it('头像完全填满容器：容器与头像同为 32px（size-8 / h-8 w-8）', () => {
    renderDock();

    const btn = screen.getByTitle(/点击向 \[小周\]/);
    expect(btn.className).toContain('size-8');

    // MemberAvatar 根节点：档位尺寸必须与容器一致，否则圆环里会露底色
    const avatarRoot = btn.querySelector('div') as HTMLElement;
    expect(avatarRoot.className).toContain('h-8');
    expect(avatarRoot.className).toContain('w-8');
  });

  it('状态点不被裁切：容器不得 overflow-hidden，且状态点挂在右下角外侧', () => {
    renderDock();

    const btn = screen.getByTitle(/点击向 \[小周\]/);
    // 头像自身会 overflow-hidden（把方图裁成圆），但**外层按钮**绝不能裁，
    // 否则 -bottom-0.5/-right-0.5 的状态点会被切掉一角
    expect(btn.className).not.toContain('overflow-hidden');

    const dot = Array.from(btn.children).find(
      (el) => el.getAttribute('aria-hidden') === 'true',
    );
    expect(dot).toBeTruthy();
    expect(dot?.className).toContain('-bottom-0.5');
    expect(dot?.className).toContain('-right-0.5');
  });
});

describe('BottomDock —— 自动隐藏与鼠标靠近浮出', () => {
  it('默认收起：只留徽章栏贴底，胶囊淡出且不可点（但仍留在 DOM 便于键盘可达）', () => {
    renderDock();

    expect(dockVisibleAttr()).toBe('false');
    const capsule = screen.getByTestId('dock-capsule');
    expect(capsule.className).toContain('opacity-0');
    expect(capsule.className).toContain('pointer-events-none');
    // 徽章栏仍在，且切到「贴底」形态——收起态它是底部唯一可见元素
    expect(screen.getByTestId('dock-badge').getAttribute('data-collapsed')).toBe('true');
  });

  it('浮出后徽章栏抬回 Dock 上方（collapsed 解除）', () => {
    renderDock();
    stubDockRect();

    moveMouseTo(400, 760);

    expect(screen.getByTestId('dock-badge').getAttribute('data-collapsed')).toBe('false');
  });

  it('鼠标靠近底部区域即浮出，离开后收起', () => {
    renderDock();
    stubDockRect();
    expect(dockVisibleAttr()).toBe('false');

    moveMouseTo(400, 760); // 区域内（y ∈ [668, 768]）
    expect(dockVisibleAttr()).toBe('true');

    moveMouseTo(400, 300); // 区域外（远在 Dock 上方）
    expect(dockVisibleAttr()).toBe('false');
  });

  it('鼠标停留在区域内时一直保持显示', () => {
    renderDock();
    stubDockRect();

    moveMouseTo(400, 760);
    expect(dockVisibleAttr()).toBe('true');

    // 在区域内继续移动（横向微移、纵向贴近 Dock）不收起
    moveMouseTo(340, 730);
    expect(dockVisibleAttr()).toBe('true');
    moveMouseTo(460, 712);
    expect(dockVisibleAttr()).toBe('true');
  });

  it('横向离开区域同样收起', () => {
    renderDock();
    stubDockRect();

    moveMouseTo(400, 760);
    expect(dockVisibleAttr()).toBe('true');

    moveMouseTo(900, 760); // 横向超出 Dock ± 32px 的判定范围
    expect(dockVisibleAttr()).toBe('false');
  });

  it('指针移出窗口后收起', () => {
    renderDock();
    stubDockRect();

    moveMouseTo(400, 760);
    expect(dockVisibleAttr()).toBe('true');

    fireEvent.mouseLeave(document);
    expect(dockVisibleAttr()).toBe('false');
  });

  it('开启「常驻显示」后始终可见，且不再监听靠近区域', () => {
    useAppStore.setState({ dockAlwaysVisible: true });
    renderDock();
    stubDockRect();

    expect(dockVisibleAttr()).toBe('true');
    moveMouseTo(400, 300); // 区域外移动也不影响
    expect(dockVisibleAttr()).toBe('true');
    expect(screen.getByTestId('dock-capsule').className).not.toContain('opacity-0');
  });

  it('设置页预览态始终展示完整 Dock（否则预览失去意义）', () => {
    renderDock({ preview: true });
    stubDockRect();

    expect(dockVisibleAttr()).toBe('true');
    moveMouseTo(400, 300);
    expect(dockVisibleAttr()).toBe('true');
  });

  it('展开输入栏时不隐藏（正在输入，收起会打断操作）', () => {
    renderDock();
    expect(dockVisibleAttr()).toBe('false');

    openPromptBar();

    expect(dockVisibleAttr()).toBe('true');
  });
});
