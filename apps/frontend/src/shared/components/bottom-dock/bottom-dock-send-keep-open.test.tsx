import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { DOCK_ITEM_IDS, useAppStore } from '@/infrastructure/store/app-store';
import { BottomDock } from './bottom-dock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy({}, { get: (_t, name: string) => (props: Record<string, unknown>) => {
    const { whileHover, whileTap, transition, layout, initial, animate, exit, ...rest } = props;
    return React.createElement(name, rest);
  }}),
}));
vi.mock('@/shared/theme/theme-context', () => ({
  useTheme: () => ({ mode: 'light', resolvedMode: 'light', toggleTheme: vi.fn() }),
}));
const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));
vi.mock('react-router-dom', () => ({ useNavigate: () => navigateMock }));
const { COLLEAGUES } = vi.hoisted(() => ({
  COLLEAGUES: [
    { id: 'assistant', name: '小周', title: '项目管理搭档', avatarUrl: null, status: 'idle', placeholder: '向小周提问或安排任务...', isMain: true },
  ],
}));
vi.mock('./use-dock-ai-colleagues', () => ({
  STATUS_DOT_CLASS: { idle: 'bg-accent-green' },
  useDockAiColleagues: () => ({ colleagues: COLLEAGUES, activeProjectId: undefined }),
}));
vi.mock('@/modules/notification/hooks/use-notifications', () => ({
  useUnreadNotificationsCount: () => ({ data: 0 }),
}));
vi.mock('./dock-user-popover', () => ({ DockUserPopover: () => <div /> }));
vi.mock('./dock-metric-badge', () => ({
  DockMetricBadge: ({ collapsed }: { collapsed?: boolean }) => <div data-testid="dock-badge" data-collapsed={String(Boolean(collapsed))} />,
}));

describe('debug enter', () => {
  beforeEach(() => {
    useAppStore.setState({ aiPanelOpen: true, dockItems: [...DOCK_ITEM_IDS], dockHiddenAssistantIds: [], dockAlwaysVisible: false, createDialog: { open: false, type: 'task' } });
  });
  it('enter debug', () => {
    const spy = vi.fn();
    useAppStore.setState({ openAssistantWithDraft: spy });
    render(<BottomDock />);
    fireEvent.click(screen.getByTitle('点击呼出 AI 快捷指令栏与对话面板'));
    const input = screen.getByPlaceholderText('向小周提问或安排任务...');
    fireEvent.input(input, { target: { value: '测试' } });
    let nativeOnInput = false;
    let nativeOnDoc = false;
    input.addEventListener('keydown', () => { nativeOnInput = true; });
    document.addEventListener('keydown', () => { nativeOnDoc = true; });
    const ev = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
     
    console.log('native input=', nativeOnInput, 'native doc=', nativeOnDoc, 'defaultPrevented=', ev.defaultPrevented, 'spyCalls=', spy.mock.calls.length);
    expect(true).toBe(true);
  });
});
