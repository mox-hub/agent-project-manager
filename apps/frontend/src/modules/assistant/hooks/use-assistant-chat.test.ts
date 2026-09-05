import { describe, expect, it } from 'vitest';
import {
  convertAssistantMessage,
  extractMessageText,
  toAssistantUiMessages,
  type AssistantChatMessage,
} from './use-assistant-chat';
import type { AssistantMessage } from '../api/assistant-api';

describe('convertAssistantMessage', () => {
  it('ui-message JSON 行水合为 UIMessage（parts + 运行态元数据）', () => {
    const row: AssistantMessage = {
      id: 'm1',
      role: 'assistant',
      content: JSON.stringify({
        id: 'm1',
        role: 'assistant',
        metadata: { modelId: 'gpt-4o' },
        parts: [{ type: 'text', state: 'done', text: '结论先行' }],
      }),
      metadata: { format: 'ui-message', status: 'done', executionRunId: 'run-1' },
      createdAt: '2026-09-03T00:00:00.000Z',
    };

    const ui = convertAssistantMessage(row);

    expect(ui).not.toBeNull();
    expect(ui!.id).toBe('m1');
    expect(ui!.metadata).toEqual({
      runStatus: 'done',
      executionRunId: 'run-1',
      modelId: 'gpt-4o',
    });
    expect(ui!.parts).toHaveLength(1);
  });

  it('旧纯文本消息回退为单 text part（user/assistant）', () => {
    const user = convertAssistantMessage({
      id: 'u1',
      role: 'user',
      content: '帮我看看风险',
      createdAt: '',
    });
    const assistant = convertAssistantMessage({
      id: 'a1',
      role: 'assistant',
      content: '结论：风险可控',
      createdAt: '',
    });

    expect(extractMessageText(user!)).toBe('帮我看看风险');
    expect(extractMessageText(assistant!)).toBe('结论：风险可控');
  });

  it('content 损坏的占位兜底为空 parts + failed 态；system 行剔除', () => {
    const broken = convertAssistantMessage({
      id: 'b1',
      role: 'assistant',
      content: '{not-json',
      metadata: { format: 'ui-message', status: 'running' },
      createdAt: '',
    });
    expect(broken!.metadata?.runStatus).toBe('running');
    expect(broken!.parts).toHaveLength(0);

    expect(
      convertAssistantMessage({
        id: 's1',
        role: 'system',
        content: 'ignored',
        createdAt: '',
      }),
    ).toBeNull();
  });

  it('toAssistantUiMessages 过滤空行并保序', () => {
    const rows: AssistantMessage[] = [
      { id: 'u1', role: 'user', content: 'q1', createdAt: '' },
      { id: 'empty', role: 'assistant', content: '', createdAt: '' },
      { id: 'a1', role: 'assistant', content: 'answer', createdAt: '' },
    ];
    const list = toAssistantUiMessages(rows);
    expect(list.map((m) => m.id)).toEqual(['u1', 'a1']);
  });

  it('extractMessageText 忽略非 text part', () => {
    const message = {
      id: 'x',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'a' },
        { type: 'tool-propose_decision', toolCallId: 't1', toolName: 'x', state: 'input-available', input: {} },
        { type: 'text', text: 'b' },
      ],
    } as unknown as AssistantChatMessage;
    expect(extractMessageText(message)).toBe('ab');
  });
});
