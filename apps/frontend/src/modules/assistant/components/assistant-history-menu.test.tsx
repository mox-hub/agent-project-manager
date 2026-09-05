import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { AssistantHistoryList } from './assistant-history-menu';
import type { AssistantConversationSummary } from '../api/assistant-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { n?: number }) =>
      opts?.n !== undefined ? `${key}:${opts.n}` : key,
  }),
}));

const conversations: AssistantConversationSummary[] = [
  {
    id: 'conv-a',
    title: '排期讨论',
    messageCount: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'conv-b',
    title: 'Main AI Assistant',
    messageCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

describe('AssistantHistoryList', () => {
  it('渲染会话标题与相对时间，空消息会话显示占位标题', () => {
    render(
      <AssistantHistoryList
        conversations={conversations}
        activeConversationId={null}
        currentConversationId="conv-a"
        onSelect={vi.fn()}
        onCreate={vi.fn()}
      />,
    );
    expect(screen.getByText('排期讨论')).toBeTruthy();
    // 两条 updatedAt 均为现在 → 都是「刚刚」
    expect(screen.getAllByText('assistant.history.justNow').length).toBe(2);
    // messageCount=0 → 占位标题「新对话」
    expect(screen.getByText('assistant.history.untitled')).toBeTruthy();
    expect(screen.getByText('assistant.history.new')).toBeTruthy();
  });

  it('点选会话回调 id，点新建回调 onCreate', () => {
    const onSelect = vi.fn();
    const onCreate = vi.fn();
    render(
      <AssistantHistoryList
        conversations={conversations}
        activeConversationId="conv-b"
        currentConversationId="conv-a"
        onSelect={onSelect}
        onCreate={onCreate}
      />,
    );
    fireEvent.click(screen.getByText('排期讨论'));
    expect(onSelect).toHaveBeenCalledWith('conv-a');
    fireEvent.click(screen.getByText('assistant.history.new'));
    expect(onCreate).toHaveBeenCalled();
  });

  it('空列表显示空态文案', () => {
    render(
      <AssistantHistoryList
        conversations={[]}
        activeConversationId={null}
        currentConversationId={null}
        onSelect={vi.fn()}
        onCreate={vi.fn()}
      />,
    );
    expect(screen.getByText('assistant.history.empty')).toBeTruthy();
  });
});
