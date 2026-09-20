import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AssistantQuickPrompts } from './assistant-quick-prompts';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('AssistantQuickPrompts', () => {
  it('无 AI 结果时回落静态三条（data-source=static）', () => {
    render(<AssistantQuickPrompts onSend={vi.fn()} />);

    expect(screen.getByText('assistant.chat.quickPrompt1')).toBeTruthy();
    expect(screen.getByText('assistant.chat.quickPrompt3')).toBeTruthy();
    expect(
      document.querySelector('[data-source="static"]'),
    ).toBeTruthy();
  });

  it('有静默 AI 结果时展示个性化问法（data-source=ai + Sparkles 标识）', () => {
    render(
      <AssistantQuickPrompts
        onSend={vi.fn()}
        aiPrompts={['本周有哪些阻塞？', '验收单还差什么？']}
      />,
    );

    expect(screen.getByText('本周有哪些阻塞？')).toBeTruthy();
    expect(screen.getByText('验收单还差什么？')).toBeTruthy();
    expect(screen.queryByText('assistant.chat.quickPrompt1')).toBeNull();
    expect(document.querySelector('[data-source="ai"]')).toBeTruthy();
  });
});
