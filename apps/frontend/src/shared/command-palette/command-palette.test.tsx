import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  CommandPaletteProvider,
  OPEN_COMMAND_PALETTE_EVENT,
  useCommandPalette,
} from './command-palette-provider';
import { commandEntries, COMMAND_GROUP_LABEL_KEYS } from './commands';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';
import { useHotkeyStore } from '@/shared/hotkeys/hotkey-store';
import { searchApi } from '@/modules/search/api/search-api';

// vitest 环境无 i18next 实例：t() 直通返回 key，带 defaultValue 时返回兜底文案
// （对齐 i18next 缺键行为，供实体搜索空态/分组标题等内联兜底断言）
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue ?? key,
  }),
}));

// 实体搜索走 searchApi：单测里 mock 掉，不触真实网络（MSW onUnhandledRequest=error）
vi.mock('@/modules/search/api/search-api', () => ({
  searchApi: { search: vi.fn() },
}));

// 内嵌 AI 问答走 assistantApi：单测里 mock 掉（不触真实 LLM 通道）
vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: { send: vi.fn() },
}));

import { assistantApi } from '@/modules/assistant/api/assistant-api';

const searchMock = vi.mocked(searchApi.search);
const sendMock = vi.mocked(assistantApi.send);

// jsdom 未实现 scrollIntoView（列表滚动定位）与 Web Animations API
// （base-ui ScrollArea viewport 淡入动画调 getAnimations），补空实现
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.getAnimations = vi.fn(
    () => [],
  ) as unknown as typeof Element.prototype.getAnimations;
});

/** 复刻 shell-layout 的映射逻辑：i18n key → 已翻译 label；entity/icon → 图标组件 */
function buildInitialCommands() {
  const t = (key: string) => key;
  return commandEntries
    .filter((entry) => !entry.adminOnly)
    .map((entry) => ({
      id: entry.id,
      label: t(entry.labelKey),
      keywords: entry.keywords,
      shortcut: entry.shortcut,
      group: t(COMMAND_GROUP_LABEL_KEYS[entry.group]),
      to: entry.to,
      icon: entry.entity
        ? getEntityIcon(entry.entity).icon
        : (entry.icon ?? undefined),
    }));
}

/** 读取 provider 内部 open 状态的探针 */
function OpenProbe() {
  const { open } = useCommandPalette();
  return <div data-testid="palette-open">{String(open)}</div>;
}

/** 读取当前路由的探针：断言搜索命中项点击后跳转到实体详情 */
function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="location-probe">{pathname}</div>;
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={['/app/projects']}>
      <QueryClientProvider client={queryClient}>
        <CommandPaletteProvider initialCommands={buildInitialCommands()}>
          <OpenProbe />
        </CommandPaletteProvider>
      </QueryClientProvider>
      <LocationProbe />
    </MemoryRouter>,
  );
}

/** 打开面板并 flush 挂载（fake timers 下同步推进一轮） */
async function openPalette() {
  act(() => {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return screen.getByPlaceholderText('commandPalette.placeholder');
}

/** 打开面板（真实计时器：挂载走 findBy 轮询） */
async function openPaletteReal() {
  act(() => {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
  });
  return screen.findByPlaceholderText('commandPalette.placeholder');
}

describe('command palette registry (commands.ts)', () => {
  it('注册表条目数 > 0 且 id 唯一', () => {
    expect(commandEntries.length).toBeGreaterThan(0);
    const ids = commandEntries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('包含新增一级命令 workflows / acceptance / decisions 且路由与 router.tsx 对齐', () => {
    const byId = new Map(commandEntries.map((entry) => [entry.id, entry]));
    expect(byId.get('cmd-workflows')?.to).toBe('/app/workflows');
    expect(byId.get('cmd-acceptance')?.to).toBe('/app/acceptance');
    expect(byId.get('cmd-decisions')?.to).toBe('/app/decisions');
    expect(byId.get('cmd-office')?.to).toBe('/app/office');
    expect(byId.get('cmd-executions')?.to).toBe('/app/executions');
    expect(byId.get('cmd-repositories')?.to).toBe('/app/repositories');
    expect(byId.get('cmd-notifications')?.to).toBe('/app/notifications');
    expect(byId.get('cmd-search')?.to).toBe('/app/search');
    expect(byId.get('cmd-profile')?.to).toBe('/app/settings/profile');
  });

  it('已删除与 cmd-ai 重复的 cmd-ai-management', () => {
    const ids = commandEntries.map((entry) => entry.id);
    expect(ids).not.toContain('cmd-ai-management');
    expect(ids).toContain('cmd-ai');
  });

  it('假 chord 快捷键已全部移除；真实快捷键走 hotkeyId 注册表声明（CAP-A-17）', () => {
    const shortcuts = commandEntries
      .map((entry) => entry.shortcut)
      .filter((shortcut): shortcut is string => Boolean(shortcut));
    expect(shortcuts).toEqual([]);
    const hotkeyIds = commandEntries
      .map((entry) => entry.hotkeyId)
      .filter((id): id is string => Boolean(id));
    expect(hotkeyIds).toEqual(['ai-assistant']);
  });

  it('每个条目都有 labelKey 与合法分组，图标二选一（entity 或 icon）已填充', () => {
    const validGroups = new Set(Object.keys(COMMAND_GROUP_LABEL_KEYS));
    for (const entry of commandEntries) {
      expect(entry.labelKey).toBeTruthy();
      expect(validGroups.has(entry.group)).toBe(true);
      // 外观改造后每条命令必须有图标：实体命令走 entity（注册表解析），动作/非实体页面给 icon
      expect(entry.entity || entry.icon).toBeTruthy();
      // 路由跳转与运行时动作至少有其一
      expect(entry.to || entry.action).toBeTruthy();
    }
  });

  it('实体命令的 entity 值合法且动作命令不误用 entity 通道', () => {
    for (const entry of commandEntries) {
      if (entry.entity) {
        expect(entry.action).toBeUndefined();
      }
    }
    // 抽查注册表口径：tasks 走 issue 实体、admin 用 UserCog（裁决口径）
    const byId = new Map(commandEntries.map((entry) => [entry.id, entry]));
    expect(byId.get('cmd-tasks')?.entity).toBe('issue');
    expect(byId.get('cmd-admin')?.icon?.displayName).toBe('UserCog');
  });

  it('admin 命令正确标记 adminOnly，其余条目不标', () => {
    const admin = commandEntries.find((entry) => entry.id === 'cmd-admin');
    expect(admin?.adminOnly).toBe(true);
    expect(commandEntries.filter((entry) => entry.adminOnly)).toEqual([admin]);
  });
});

describe('CommandPaletteProvider', () => {
  it('TabBar 派发的 open-command-palette 事件可打开面板', async () => {
    renderProvider();

    expect(screen.getByTestId('palette-open').textContent).toBe('false');
    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    });
    await waitFor(() =>
      expect(screen.getByTestId('palette-open').textContent).toBe('true'),
    );
  });

  it('面板打开后渲染 i18n 化的输入框与空态占位', async () => {
    renderProvider();

    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    });
    await waitFor(() =>
      expect(screen.getByTestId('palette-open').textContent).toBe('true'),
    );

    // t() 直通返回 key：placeholder/empty 均来自 commandPalette.* 键而非硬编码英文
    await waitFor(() =>
      expect(screen.getByPlaceholderText('commandPalette.placeholder')).toBeTruthy(),
    );
  });
});

describe('CommandPaletteProvider 快捷键收编（CAP-A-17 注册表）', () => {
  it('缺省 Ctrl+K 切换面板，旧 Ctrl+/ 双键已随收编移除', async () => {
    renderProvider();

    expect(screen.getByTestId('palette-open').textContent).toBe('false');
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });
    await waitFor(() =>
      expect(screen.getByTestId('palette-open').textContent).toBe('true'),
    );

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true }),
      );
    });
    // Ctrl+/ 不再有监听：面板保持开启不被切换
    expect(screen.getByTestId('palette-open').textContent).toBe('true');
  });

  it('用户自定义改键后：旧键失效、新键生效（注册表 override 驱动监听）', async () => {
    useHotkeyStore.getState().setOverride('command-palette', 'mod+j');
    try {
      renderProvider();

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
        );
      });
      expect(screen.getByTestId('palette-open').textContent).toBe('false');

      act(() => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'j', ctrlKey: true, bubbles: true }),
        );
      });
      await waitFor(() =>
        expect(screen.getByTestId('palette-open').textContent).toBe('true'),
      );
    } finally {
      act(() => {
        useHotkeyStore.getState().resetAll();
      });
    }
  });
});

describe('命令面板实体搜索（P1-13：工单/项目接入 /search）', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('面板打开未输入时不发请求，空态提示「输入以搜索工单/项目」', async () => {
    vi.useFakeTimers();
    renderProvider();
    await openPalette();

    expect(searchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('palette-entity-search-hint').textContent).toBe(
      '输入以搜索工单/项目',
    );
  });

  it('输入经 300ms 防抖后单次调用 /search（抖动合并只保留最后一次，仅工单/项目类别）', async () => {
    vi.useFakeTimers();
    // 注：react-query 的结果通知在 fake timers 下不落 DOM（React 调度不走 fake clock），
    // 故本用例只断言请求时序；结果渲染断言见下方真实计时器用例。
    searchMock.mockResolvedValue({ items: [], total: 0 });
    renderProvider();
    const input = await openPalette();

    fireEvent.change(input, { target: { value: '登录' } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });
    fireEvent.change(input, { target: { value: '登录崩' } });
    expect(searchMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(searchMock).toHaveBeenCalledTimes(1);
    expect(searchMock.mock.calls[0]?.[0]).toEqual({
      q: '登录崩',
      types: ['task', 'bug', 'project'],
      limit: 8,
    });
  });

  it('命中工单/项目以「搜索结果」分组渲染，点击跳转对应详情路由', async () => {
    searchMock.mockResolvedValue({
      items: [
        {
          id: 'issue-1',
          type: 'task',
          title: '登录页崩溃',
          subtitle: 'BUG-1 · 高',
          path: '/app/issues/issue-1',
          updatedAt: '2026-09-18T00:00:00.000Z',
        },
        {
          id: 'project-1',
          type: 'project',
          title: 'APM 主项目',
          subtitle: '3 个进行中工单',
          path: '/app/projects/project-1',
          updatedAt: '2026-09-19T00:00:00.000Z',
        },
      ],
      total: 2,
    });
    renderProvider();
    const input = await openPaletteReal();
    fireEvent.change(input, { target: { value: '登录' } });

    // 防抖 300ms 后请求并渲染（真实计时器 + waitFor 轮询）
    await waitFor(
      () => expect(screen.getByText('APM 主项目')).toBeTruthy(),
      { timeout: 2000 },
    );
    expect(screen.getByText('搜索结果')).toBeTruthy();
    expect(screen.getByText('登录页崩溃')).toBeTruthy();

    fireEvent.click(screen.getByText('APM 主项目'));
    expect(screen.getByTestId('location-probe').textContent).toBe(
      '/app/projects/project-1',
    );
    // 选中后面板关闭
    expect(screen.getByTestId('palette-open').textContent).toBe('false');
  });

  it('返回零命中时不渲染搜索分组，保留「输入以搜索」空态提示', async () => {
    searchMock.mockResolvedValue({ items: [], total: 0 });
    renderProvider();
    const input = await openPaletteReal();
    fireEvent.change(input, { target: { value: 'zzz-无命中' } });

    await waitFor(() => expect(searchMock).toHaveBeenCalledTimes(1), {
      timeout: 2000,
    });
    expect(screen.queryByText('搜索结果')).toBeNull();
    expect(screen.getByTestId('palette-entity-search-hint')).toBeTruthy();
  });
});

describe('coss p-command 引擎行为（base-ui autocomplete 替换 cmdk 后）', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('输入关键词按 label/keywords 过滤命令，不匹配条目从面板移除', async () => {
    searchMock.mockResolvedValue({ items: [], total: 0 });
    renderProvider();
    const input = await openPaletteReal();
    fireEvent.change(input, { target: { value: 'workflow' } });

    await waitFor(() =>
      expect(screen.getByText('shell.openWorkflows')).toBeTruthy(),
    );
    expect(screen.queryByText('shell.openProjects')).toBeNull();
  });

  it('Enter 选中高亮项跳转对应路由并关闭面板', async () => {
    searchMock.mockResolvedValue({ items: [], total: 0 });
    renderProvider();
    const input = await openPaletteReal();
    fireEvent.change(input, { target: { value: 'workflow' } });

    // 等 base-ui autoHighlight 把首条置为高亮（data-highlighted）再回车
    await waitFor(() => {
      const item = screen.getByText('shell.openWorkflows').closest('[data-slot=command-item]');
      expect(item?.hasAttribute('data-highlighted')).toBe(true);
    });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/app/workflows'),
    );
    expect(screen.getByTestId('palette-open').textContent).toBe('false');
  });

  it('零命中回车带词进入内嵌 AI 问答并直接提问（assistantApi.send 真通道 mock）', async () => {
    sendMock.mockResolvedValue({
      conversationId: 'conv-1',
      mode: 'sync',
      message: { id: 'msg-1', role: 'assistant', content: '这是面板回答' },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    searchMock.mockResolvedValue({ items: [], total: 0 });
    render(
      <MemoryRouter initialEntries={['/app/projects']}>
        <QueryClientProvider client={queryClient}>
          <CommandPaletteProvider
            initialCommands={[{ id: 'cmd-projects', label: 'shell.openProjects', to: '/app/projects' }]}
          >
            <OpenProbe />
          </CommandPaletteProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    });
    const input = await screen.findByPlaceholderText('commandPalette.placeholder');
    fireEvent.change(input, { target: { value: 'zzz-无匹配' } });

    await waitFor(() =>
      expect(screen.getByText('按 Enter 询问 AI 助手：')).toBeTruthy(),
    );
    fireEvent.keyDown(input, { key: 'Enter' });

    // 进入 AI 模式并自动提问：send 收到原查询词，回答内嵌渲染，面板保持打开
    await waitFor(() => expect(sendMock).toHaveBeenCalledTimes(1));
    expect(sendMock.mock.calls[0]?.[0]).toEqual({ content: 'zzz-无匹配' });
    await waitFor(() =>
      expect(screen.getByText('这是面板回答')).toBeTruthy(),
    );
    expect(screen.getByTestId('palette-open').textContent).toBe('true');
  });

  it('Tab 进入内嵌 AI 问答模式（不再跳转系统助手）', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter initialEntries={['/app/projects']}>
        <QueryClientProvider client={queryClient}>
          <CommandPaletteProvider
            initialCommands={[{ id: 'cmd-projects', label: 'shell.openProjects', to: '/app/projects' }]}
          >
            <OpenProbe />
          </CommandPaletteProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    });
    const input = await screen.findByPlaceholderText('commandPalette.placeholder');
    fireEvent.keyDown(input, { key: 'Tab' });

    // AI 模式输入框出现（placeholder 走 t 兜底文案），仍处于打开态
    expect(await screen.findByPlaceholderText('问问 AI…')).toBeTruthy();
    expect(screen.getByTestId('palette-open').textContent).toBe('true');
  });

  it('AI 模式下 Esc 返回搜索模式而非关闭面板', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <MemoryRouter initialEntries={['/app/projects']}>
        <QueryClientProvider client={queryClient}>
          <CommandPaletteProvider
            initialCommands={[{ id: 'cmd-projects', label: 'shell.openProjects', to: '/app/projects' }]}
          >
            <OpenProbe />
          </CommandPaletteProvider>
        </QueryClientProvider>
      </MemoryRouter>,
    );
    act(() => {
      window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
    });
    const input = await screen.findByPlaceholderText('commandPalette.placeholder');
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(await screen.findByPlaceholderText('问问 AI…')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(await screen.findByPlaceholderText('commandPalette.placeholder')).toBeTruthy();
    expect(screen.getByTestId('palette-open').textContent).toBe('true');
  });

  it('Ctrl+1..9 快速选择可见条目（首条=导航分组第一项）', async () => {
    searchMock.mockResolvedValue({ items: [], total: 0 });
    renderProvider();
    const input = await openPaletteReal();

    // 空查询下可见序首条 = cmd-projects（/app/projects）
    fireEvent.keyDown(input, { key: '1', ctrlKey: true });
    await waitFor(() =>
      expect(screen.getByTestId('location-probe').textContent).toBe('/app/projects'),
    );
    expect(screen.getByTestId('palette-open').textContent).toBe('false');
  });
});
