import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ShortcutsSettingsSection } from './shortcuts-section';
import { useHotkeyStore } from '@/shared/hotkeys/hotkey-store';

// vitest 环境无 i18next 实例：t() 直通返回 key（插值原样保留 key 名可断言冲突文案存在）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: { action?: string }) => (opts?.action ? `${key}:${opts.action}` : key) }),
}));

// PageShell 内嵌 PageHeader 依赖收藏/标签页上下文，section 测试只关注卡片内容
vi.mock('@/components/ui/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

beforeEach(() => {
  useHotkeyStore.getState().resetAll();
});

describe('ShortcutsSettingsSection 快捷键设置页', () => {
  it('渲染全局动作行与上下文参考行（注册表驱动）', () => {
    render(<ShortcutsSettingsSection />);

    expect(screen.getByTestId('shortcut-row-command-palette')).toBeTruthy();
    expect(screen.getByTestId('shortcut-row-ai-assistant')).toBeTruthy();
    expect(screen.getByTestId('shortcut-row-document-save')).toBeTruthy();
    expect(screen.getByTestId('shortcut-row-decision-review')).toBeTruthy();
    // 上下文行只读：无修改按钮
    expect(screen.queryByTestId('shortcut-modify-document-save')).toBeNull();
    expect(screen.getByTestId('shortcut-modify-command-palette')).toBeTruthy();
  });

  it('录制流程：点修改进入录制态 → 按新组合键落库生效', async () => {
    render(<ShortcutsSettingsSection />);

    fireEvent.click(screen.getByTestId('shortcut-modify-command-palette'));
    expect(screen.getByTestId('shortcut-recording-command-palette')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    await waitFor(() => {
      expect(useHotkeyStore.getState().overrides['command-palette']).toBe('mod+j');
    });
    // 录制完成退出录制态
    expect(screen.queryByTestId('shortcut-recording-command-palette')).toBeNull();
  });

  it('录制中 Esc 取消且不落库；单修饰键不算完成', async () => {
    render(<ShortcutsSettingsSection />);

    fireEvent.click(screen.getByTestId('shortcut-modify-ai-assistant'));
    // 先按一个纯 Ctrl（无主键）：仍是录制态
    fireEvent.keyDown(window, { key: 'Control', ctrlKey: true });
    expect(screen.getByTestId('shortcut-recording-ai-assistant')).toBeTruthy();
    expect(useHotkeyStore.getState().overrides['ai-assistant']).toBeUndefined();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('shortcut-recording-ai-assistant')).toBeNull();
    });
    expect(useHotkeyStore.getState().overrides['ai-assistant']).toBeUndefined();
  });

  it('冲突检测：录制与其他动作生效键相同的组合 → 红字提示且不落库', async () => {
    render(<ShortcutsSettingsSection />);

    fireEvent.click(screen.getByTestId('shortcut-modify-ai-assistant'));
    // mod+k 是 command-palette 的当前生效键：必须拒绝
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    await waitFor(() => {
      expect(screen.getByTestId('shortcut-conflict-ai-assistant')).toBeTruthy();
    });
    expect(useHotkeyStore.getState().overrides['ai-assistant']).toBeUndefined();
    // 冲突文案携带对方动作名（t 透传 mock 以 : 分隔）
    expect(screen.getByTestId('shortcut-conflict-ai-assistant').textContent)
      .toContain('hotkeys.commandPalette');
  });

  it('改键后出现单项重置与「已自定义」标记；重置恢复缺省', async () => {
    render(<ShortcutsSettingsSection />);

    fireEvent.click(screen.getByTestId('shortcut-modify-command-palette'));
    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    await waitFor(() => {
      expect(useHotkeyStore.getState().overrides['command-palette']).toBe('mod+j');
    });
    expect(screen.getByText('settings.shortcutsModified')).toBeTruthy();

    fireEvent.click(screen.getByTestId('shortcut-reset-command-palette'));
    await waitFor(() => {
      expect(useHotkeyStore.getState().overrides['command-palette']).toBeUndefined();
    });
  });

  it('有自定义时显示全部恢复默认，点击清空全部 override', async () => {
    useHotkeyStore.getState().setOverride('command-palette', 'mod+j');
    render(<ShortcutsSettingsSection />);

    fireEvent.click(screen.getByTestId('shortcut-reset-all'));
    await waitFor(() => {
      expect(Object.keys(useHotkeyStore.getState().overrides)).toHaveLength(0);
    });
  });
});
