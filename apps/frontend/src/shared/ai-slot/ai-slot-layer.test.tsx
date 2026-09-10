import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { AISlotLayer } from './ai-slot-layer';

/** useMutation 返回值的组件消费面裁剪（避免 hoisted 块引用 TS 类型工具） */
interface MutationStub {
  mutate: (input?: { kind: string; id: string }) => void;
  isPending: boolean;
  isError: boolean;
  data?: { scenario: string; data: Record<string, unknown> };
}

const askDraftSpy = vi.hoisted(() => vi.fn());
const mutationHolder = vi.hoisted(() => ({
  current: null as MutationStub | null,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (s: unknown) => unknown) =>
    selector({ openAssistantWithDraft: askDraftSpy }),
}));

vi.mock('@/modules/assistant/hooks/use-silent-ai', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/modules/assistant/hooks/use-silent-ai')>();
  return {
    ...actual,
    useCardExplain: () => mutationHolder.current,
  };
});

function makeMutation(over: Partial<MutationStub> = {}): MutationStub {
  return {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    data: undefined,
    ...over,
  };
}

function renderFixture() {
  return render(
    <div>
      <div data-ai-entity="task:t1" style={{ width: 300, height: 120 }}>
        登录接口 500
      </div>
      <div data-ai-entity="member:m1">小周</div>
      <AISlotLayer />
    </div>,
  );
}

const explainPayload = {
  scenario: 'card-explain',
  data: {
    title: '登录接口 500',
    summary: '这是一个缺陷任务，正在修复。',
    details: [{ label: '状态', text: '进行中' }],
    nextStep: '等修复后验收',
  },
};

beforeEach(() => {
  mutationHolder.current = makeMutation();
  askDraftSpy.mockClear();
});

describe('AISlotLayer', () => {
  it('Ctrl+左键 data-ai-entity 卡片：overlay 出现并按卡片属性发起解释请求', () => {
    renderFixture();
    expect(screen.queryByTestId('ai-slot-overlay')).toBeNull();

    fireEvent.click(screen.getByText('登录接口 500'), {
      ctrlKey: true,
      button: 0,
    });

    const overlay = screen.getByTestId('ai-slot-overlay');
    expect(overlay).toBeTruthy();
    expect(mutationHolder.current.mutate).toHaveBeenCalledWith({
      kind: 'task',
      id: 't1',
    });
  });

  it('Cmd+左键同样触发；无修饰键普通点击不触发', () => {
    renderFixture();
    fireEvent.click(screen.getByText('登录接口 500'), {
      metaKey: true,
      button: 0,
    });
    expect(screen.getByTestId('ai-slot-overlay')).toBeTruthy();

    fireEvent.click(screen.getByText('小周'), { button: 0 });
    expect(mutationHolder.current.mutate).not.toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'member' }),
    );
  });

  it('data-ai-entity 值非法（缺 id）时不触发', () => {
    render(
      <div>
        <div data-ai-entity="broken">坏属性卡</div>
        <AISlotLayer />
      </div>,
    );
    fireEvent.click(screen.getByText('坏属性卡'), { ctrlKey: true, button: 0 });
    expect(screen.queryByTestId('ai-slot-overlay')).toBeNull();
  });

  it('ESC 关闭 overlay（恢复原卡）', () => {
    renderFixture();
    fireEvent.click(screen.getByText('登录接口 500'), {
      ctrlKey: true,
      button: 0,
    });
    expect(screen.getByTestId('ai-slot-overlay')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByTestId('ai-slot-overlay')).toBeNull();
  });

  it('解释数据渲染：标题/摘要/逐项/建议下一步 + 继续追问', () => {
    mutationHolder.current = makeMutation({
      data: explainPayload as never,
    });
    renderFixture();
    fireEvent.click(screen.getByText('登录接口 500'), {
      ctrlKey: true,
      button: 0,
    });

    expect(screen.getByText('这是一个缺陷任务，正在修复。')).toBeTruthy();
    expect(screen.getByText('状态')).toBeTruthy();
    expect(screen.getByText('等修复后验收')).toBeTruthy();

    fireEvent.click(screen.getByText('aiSlot.askMore'));
    expect(askDraftSpy).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('ai-slot-overlay')).toBeNull();
  });

  it('错误态展示文案与重试按钮，点击重试再次请求', () => {
    const mutate = vi.fn();
    mutationHolder.current = makeMutation({
      mutate,
      isError: true,
    });
    renderFixture();
    fireEvent.click(screen.getByText('登录接口 500'), {
      ctrlKey: true,
      button: 0,
    });

    expect(screen.getByText('aiSlot.error')).toBeTruthy();
    fireEvent.click(screen.getByText('aiSlot.retry'));
    expect(mutate).toHaveBeenCalledTimes(2);
  });

  it('长按 Ctrl 超 500ms：根元素挂高亮类，松开移除', () => {
    vi.useFakeTimers();
    try {
      renderFixture();
      fireEvent.keyDown(window, { key: 'Control' });
      act(() => {
        vi.advanceTimersByTime(500);
      });
      expect(
        document.documentElement.classList.contains('ai-slot-discovery'),
      ).toBe(true);

      fireEvent.keyUp(window, { key: 'Control' });
      expect(
        document.documentElement.classList.contains('ai-slot-discovery'),
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('组合键（Ctrl+C）：500ms 窗口内其他键按下取消，不进入高亮', () => {
    vi.useFakeTimers();
    try {
      renderFixture();
      fireEvent.keyDown(window, { key: 'Control' });
      fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(
        document.documentElement.classList.contains('ai-slot-discovery'),
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('长按不足 500ms 松开：不进入高亮', () => {
    vi.useFakeTimers();
    try {
      renderFixture();
      fireEvent.keyDown(window, { key: 'Control' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      fireEvent.keyUp(window, { key: 'Control' });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(
        document.documentElement.classList.contains('ai-slot-discovery'),
      ).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
