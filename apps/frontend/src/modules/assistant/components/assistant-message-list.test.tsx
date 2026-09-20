import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { AssistantChatMessage } from '../hooks/use-assistant-chat';
import { AssistantChatSession } from '../hooks/use-assistant-chat';
import { AssistantMessageList } from './assistant-message-list';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function renderList(messages: AssistantChatMessage[]) {
  return render(
    <AssistantChatSession initialMessages={messages} conversationId="conv-1">
      <AssistantMessageList />
    </AssistantChatSession>,
  );
}

describe('AssistantMessageList', () => {
  it('user/assistant 气泡按 parts 渲染（text 经 Markdown 视图）', () => {
    renderList([
      { id: 'u1', role: 'user', parts: [{ type: 'text', text: '项目进展如何' }] },
      {
        id: 'a1',
        role: 'assistant',
        metadata: { runStatus: 'done' },
        parts: [{ type: 'text', state: 'done', text: '**结论**：正常' }],
      },
    ]);

    expect(screen.getByText('项目进展如何')).toBeTruthy();
    expect(screen.getByText(/结论/)).toBeTruthy();
    expect(
      document.querySelector('[data-ai-component="assistant.message-assistant"]'),
    ).toBeTruthy();
  });

  it('running 占位（空 parts + runStatus running）渲染工作指示', () => {
    renderList([
      {
        id: 'a-run',
        role: 'assistant',
        metadata: { runStatus: 'running', executionRunId: 'run-1' },
        parts: [],
      },
    ]);

    expect(screen.getByText('assistant.chat.working')).toBeTruthy();
    expect(
      document.querySelector('[data-ai-component="assistant.message-pending"]'),
    ).toBeTruthy();
  });

  it('工具调用段渲染折叠工具卡（残缺决策输出回退普通卡），text 段照常渲染', () => {
    renderList([
      {
        id: 'a-tool',
        role: 'assistant',
        parts: [
          {
            type: 'tool-propose_decision',
            toolCallId: 't1',
            toolName: 'propose_decision',
            state: 'output-available',
            input: {},
            output: { proposalId: 'p1' },
          },
          { type: 'text', state: 'done', text: '已给出建议卡' },
        ].map((p) =>
          p.type.startsWith('tool-')
            ? ({ ...p, toolName: 'propose_decision' } as never)
            : p,
        ) as AssistantChatMessage['parts'],
      },
    ]);

    expect(
      document.querySelector('[data-ai-component="assistant.tool-card"]'),
    ).toBeTruthy();
    expect(screen.getByText('已给出建议卡')).toBeTruthy();
  });
});
