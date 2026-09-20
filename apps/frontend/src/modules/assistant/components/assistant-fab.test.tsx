import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { useAppStore } from '@/infrastructure/store/app-store';
import { AssistantFab } from './assistant-fab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// 面板本体依赖大量会话查询，这里只验证浮窗壳层的退出判定
vi.mock('./assistant-panel', () => ({
  AssistantPanel: () => <div data-testid="assistant-panel">对话面板</div>,
}));

function openPanel() {
  useAppStore.setState({ aiPanelOpen: true });
  render(<AssistantFab />);
  return screen.getByLabelText('assistant.personaName');
}

beforeEach(() => {
  useAppStore.setState({ aiPanelOpen: false, assistantExpanded: false });
});

describe('AssistantFab —— 退出判定区域（回归：侧栏/弹窗内部点击不得关闭主窗口）', () => {
  it('面板开启时点自身不关闭', () => {
    const fab = openPanel();
    fireEvent.mouseDown(fab);
    expect(useAppStore.getState().aiPanelOpen).toBe(true);
  });

  it('面板开启时点面外区域关闭', () => {
    openPanel();
    fireEvent.mouseDown(document.body);
    expect(useAppStore.getState().aiPanelOpen).toBe(false);
  });

  it('ESC 关闭面板', () => {
    openPanel();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(useAppStore.getState().aiPanelOpen).toBe(false);
  });

  it('内层浮层已打开时 ESC 让位（不连带关闭面板）', () => {
    openPanel();
    const popover = document.createElement('div');
    popover.setAttribute('data-slot', 'popover-content');
    document.body.appendChild(popover);

    fireEvent.keyDown(document.body, { key: 'Escape' });

    expect(useAppStore.getState().aiPanelOpen).toBe(true);
    popover.remove();
  });

  it('面板关闭时不响应 ESC 与外部点击（未挂载监听）', () => {
    render(<AssistantFab />);
    fireEvent.keyDown(document.body, { key: 'Escape' });
    fireEvent.mouseDown(document.body);
    expect(useAppStore.getState().aiPanelOpen).toBe(false);
  });
});
