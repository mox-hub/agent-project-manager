import { describe, expect, it, vi, beforeAll } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  CommandPaletteProvider,
  OPEN_COMMAND_PALETTE_EVENT,
  useCommandPalette,
} from './command-palette-provider';
import { commandEntries, COMMAND_GROUP_LABEL_KEYS } from './commands';

// vitest 环境无 i18next 实例：t() 直通返回 key（与现有组件测试做法一致）
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// jsdom 未实现 scrollIntoView，cmdk 渲染选中项时会调用
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

/** 复刻 shell-layout 的映射逻辑：i18n key → 已翻译 label（provider 契约为已翻译字符串） */
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
    }));
}

/** 读取 provider 内部 open 状态的探针 */
function OpenProbe() {
  const { open } = useCommandPalette();
  return <div data-testid="palette-open">{String(open)}</div>;
}

function renderProvider() {
  return render(
    <MemoryRouter>
      <CommandPaletteProvider initialCommands={buildInitialCommands()}>
        <OpenProbe />
      </CommandPaletteProvider>
    </MemoryRouter>,
  );
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

  it('假 chord 快捷键已全部移除，仅保留真实存在的 Alt A（仅展示不绑定）', () => {
    const shortcuts = commandEntries
      .map((entry) => entry.shortcut)
      .filter((shortcut): shortcut is string => Boolean(shortcut));
    expect(shortcuts).toEqual(['Alt A']);
  });

  it('每个条目都有 labelKey 与合法分组，icon 预留字段未被填充', () => {
    const validGroups = new Set(Object.keys(COMMAND_GROUP_LABEL_KEYS));
    for (const entry of commandEntries) {
      expect(entry.labelKey).toBeTruthy();
      expect(validGroups.has(entry.group)).toBe(true);
      expect(entry.icon).toBeUndefined();
      // 路由跳转与运行时动作至少有其一
      expect(entry.to || entry.action).toBeTruthy();
    }
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
