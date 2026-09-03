import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssistantColleagueSlot } from './assistant-colleague-slot';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockState = vi.hoisted(() => ({
  status: { state: 'idle', pending: 0, blocking: 0, advisory: 0 },
  aiPanelOpen: false,
  setAiPanelOpen: vi.fn(),
}));

vi.mock('../hooks/use-assistant-status', () => ({
  useAssistantStatus: () => mockState.status,
}));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (s: typeof mockState) => unknown) => selector(mockState),
}));

describe('AssistantColleagueSlot', () => {
  beforeEach(() => {
    mockState.status = { state: 'idle', pending: 0, blocking: 0, advisory: 0 };
    mockState.aiPanelOpen = false;
    mockState.setAiPanelOpen.mockClear();
  });

  it('展开态渲染人格名与状态标签', () => {
    render(<AssistantColleagueSlot collapsed={false} />);
    expect(screen.getByText('assistant.personaName')).toBeTruthy();
    expect(screen.getByText('assistant.status.idle')).toBeTruthy();
  });

  it('needYou 且有待决时显示计数 pill', () => {
    mockState.status = { state: 'needYou', pending: 3, blocking: 1, advisory: 2 };
    render(<AssistantColleagueSlot collapsed={false} />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('assistant.status.needYou')).toBeTruthy();
  });

  it('idle 无待决时不显示计数', () => {
    render(<AssistantColleagueSlot collapsed={false} />);
    expect(screen.queryByText('0')).toBeNull();
  });

  it('点击开合助手面板', () => {
    render(<AssistantColleagueSlot collapsed={false} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockState.setAiPanelOpen).toHaveBeenCalledWith(true);
  });

  it('收起态仅头像按钮（aria-label 可寻址）', () => {
    render(<AssistantColleagueSlot collapsed />);
    const btn = screen.getByRole('button', { name: 'assistant.colleague.open' });
    fireEvent.click(btn);
    expect(mockState.setAiPanelOpen).toHaveBeenCalledWith(true);
    expect(screen.queryByText('assistant.personaName')).toBeNull();
  });
});
