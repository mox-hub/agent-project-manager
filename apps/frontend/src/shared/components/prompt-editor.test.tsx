import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { estimateTokens, PromptEditor } from './prompt-editor';
import { usePromptConfig } from '@/modules/prompt/api/prompt-api';

// jsdom 无 PointerEvent：fireEvent 拿不到 clientY，补一个最小 polyfill
beforeAll(() => {
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEventPolyfill extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit = {}) {
        const { pointerId = 1, ...mouseInit } = init;
        super(type, mouseInit);
        this.pointerId = pointerId;
      }
    }
    Object.defineProperty(window, 'PointerEvent', {
      value: PointerEventPolyfill,
      configurable: true,
    });
  }
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts && Object.keys(opts).length
        ? `${key}:${Object.entries(opts)
            .map(([k, v]) => `${k}=${v}`)
            .join(',')}`
        : key,
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/modules/prompt/api/prompt-api', () => ({
  usePromptConfig: vi.fn(),
}));

const mockConfig = vi.mocked(usePromptConfig);

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('estimateTokens（字符/4 粗估，与 server ai-hub 同口径）', () => {
  it('空串为 0', () => expect(estimateTokens('')).toBe(0));
  it('不足 4 字符向上取整为 1', () => {
    expect(estimateTokens('abc')).toBe(1);
    expect(estimateTokens('abcd')).toBe(1);
  });
  it('长文本按 4 字符一个 token', () =>
    expect(estimateTokens('a'.repeat(401))).toBe(101));
  it('中文按字符数参与估算（不按字节）', () =>
    expect(estimateTokens('中文提示词')).toBe(2));
});

describe('PromptEditor（CAP-A-24 提示词编辑/查看复用组件）', () => {
  beforeEach(() => {
    mockConfig.mockReturnValue(undefined as never);
  });

  it('只读态：渲染 markdown 正文与左上角字符数·预计 token，无输入件', () => {
    const value = '# 项目约定\n提交前自测';
    renderWithProviders(<PromptEditor value={value} readOnly />);
    expect(screen.getByText('项目约定')).toBeTruthy();
    expect(screen.getByText('提交前自测')).toBeTruthy();
    expect(
      screen.getByText(
        `promptEditor.metaStats:chars=${value.length},tokens=3`,
      ),
    ).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('只读态：空值显示占位而不渲染空 markdown', () => {
    renderWithProviders(<PromptEditor value="" readOnly placeholder="prompts.emptyHint" />);
    expect(screen.getByText('prompts.emptyHint')).toBeTruthy();
  });

  it('只读态：传 injectionKey 时按系统注入开关显示启用状态徽标', () => {
    mockConfig.mockReturnValue({
      data: { toggles: { system: true } },
    } as never);
    const { container } = renderWithProviders(
      <PromptEditor value="# 系统规范" readOnly injectionKey="system" />,
    );
    const badge = container.querySelector('[data-ai-component="shared.prompt-editor.injection"]');
    expect(badge?.getAttribute('data-state')).toBe('on');
    expect(screen.getByText('promptEditor.injectionOn')).toBeTruthy();
  });

  it('只读态：注入开关关闭时徽标显示停用态', () => {
    mockConfig.mockReturnValue({
      data: { toggles: { system: false } },
    } as never);
    const { container } = renderWithProviders(
      <PromptEditor value="# 系统规范" readOnly injectionKey="system" />,
    );
    const badge = container.querySelector('[data-ai-component="shared.prompt-editor.injection"]');
    expect(badge?.getAttribute('data-state')).toBe('off');
    expect(screen.getByText('promptEditor.injectionOff')).toBeTruthy();
  });

  it('不传 injectionKey 时不读注入配置（零请求）', () => {
    renderWithProviders(<PromptEditor value="x" readOnly />);
    expect(mockConfig).not.toHaveBeenCalled();
  });

  it('编辑态：块渲染 + 点击块就地编辑，修改经 onChange 回写', () => {
    const onChange = vi.fn();
    renderWithProviders(<PromptEditor value="# 标题" onChange={onChange} />);
    // 初始为渲染态块
    expect(screen.getByText('标题')).toBeTruthy();
    // mousedown 抢先换块（组件用 onMouseDown 防 blur 竞态）
    fireEvent.mouseDown(screen.getByText('标题'));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('# 标题');
    fireEvent.change(textarea, { target: { value: '# 新标题' } });
    expect(onChange).toHaveBeenCalledWith('# 新标题');
  });

  it('编辑态：空值直接给占位输入区，键入即回写', () => {
    const onChange = vi.fn();
    renderWithProviders(
      <PromptEditor value="" onChange={onChange} placeholder="taskDetail.promptPlaceholder" />,
    );
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '要求' } });
    expect(onChange).toHaveBeenCalledWith('要求');
  });

  it('默认提示词：value 为空时回落展示 defaultValue，计数按默认内容', () => {
    const defaultPrompt = '# 默认约定\n提交前自测';
    renderWithProviders(
      <PromptEditor value="" onChange={() => {}} defaultValue={defaultPrompt} />,
    );
    expect(screen.getByText('默认约定')).toBeTruthy();
    expect(
      screen.getByText(
        `promptEditor.metaStats:chars=${defaultPrompt.length},tokens=3`,
      ),
    ).toBeTruthy();
  });

  it('默认提示词：value 非空时不回落，展示实际内容', () => {
    renderWithProviders(
      <PromptEditor value="# 实际内容" onChange={() => {}} defaultValue="# 默认约定" />,
    );
    expect(screen.getByText('实际内容')).toBeTruthy();
    expect(screen.queryByText('默认约定')).toBeNull();
  });

  it('编辑态：固定高度容器（缺省 240px）+ 拖拽手柄，仅竖向滚动类', () => {
    const { container } = renderWithProviders(
      <PromptEditor value="# 标题" onChange={() => {}} />,
    );
    const body = container.querySelector(
      '[data-ai-component="shared.prompt-editor.body"]',
    ) as HTMLElement;
    expect(body.style.height).toBe('240px');
    expect(body.className).toContain('overflow-y-auto');
    expect(body.className).toContain('overflow-x-hidden');
    expect(
      container.querySelector('[data-ai-component="shared.prompt-editor.resize"]'),
    ).toBeTruthy();
  });

  it('编辑态：height prop 覆盖初始固定高度', () => {
    const { container } = renderWithProviders(
      <PromptEditor value="# 标题" onChange={() => {}} height={320} />,
    );
    const body = container.querySelector(
      '[data-ai-component="shared.prompt-editor.body"]',
    ) as HTMLElement;
    expect(body.style.height).toBe('320px');
  });

  it('编辑态：底部拖拽手柄可调高（pointer 事件）', () => {
    const { container } = renderWithProviders(
      <PromptEditor value="# 标题" onChange={() => {}} height={240} />,
    );
    const handle = container.querySelector(
      '[data-ai-component="shared.prompt-editor.resize"]',
    ) as HTMLElement;
    const body = container.querySelector(
      '[data-ai-component="shared.prompt-editor.body"]',
    ) as HTMLElement;
    fireEvent.pointerDown(handle, { clientY: 100, button: 0 });
    fireEvent.pointerMove(window, { clientY: 160 });
    expect(body.style.height).toBe('300px');
    fireEvent.pointerMove(window, { clientY: 120 });
    expect(body.style.height).toBe('260px');
    fireEvent.pointerUp(window);
    fireEvent.pointerMove(window, { clientY: 400 });
    // 松手后拖拽结束，高度不再跟随
    expect(body.style.height).toBe('260px');
  });

  it('编辑态：底部动作槽渲染（保存/撤销等调用方动作）', () => {
    renderWithProviders(<PromptEditor value="x" onChange={() => {}} actions={<button>保存</button>} />);
    expect(screen.getByText('保存')).toBeTruthy();
  });

  it('增强 B AI 起草：点起草→生成→对照弹层→采用写回 onChange', async () => {
    const onChange = vi.fn();
    const onDraft = vi.fn().mockResolvedValue('# AI 草稿\n由 AI 代写');
    renderWithProviders(
      <PromptEditor value="# 当前" onChange={onChange} onDraft={onDraft} />,
    );
    fireEvent.click(screen.getByText('promptEditor.draft'));
    // 异步生成完成后弹层展示草稿
    await screen.findByText('由 AI 代写');
    expect(screen.getByText('promptEditor.draftSuggestion')).toBeTruthy();
    fireEvent.click(screen.getByText('promptEditor.draftApply'));
    expect(onChange).toHaveBeenCalledWith('# AI 草稿\n由 AI 代写');
    // 弹层关闭（草稿态清空）
    expect(screen.queryByText('promptEditor.draftApply')).toBeNull();
  });

  it('增强 B AI 起草：生成失败时展示失败提示，不写回', async () => {
    const onChange = vi.fn();
    const onDraft = vi.fn().mockRejectedValue(new Error('boom'));
    renderWithProviders(
      <PromptEditor value="" onChange={onChange} onDraft={onDraft} />,
    );
    fireEvent.click(screen.getByText('promptEditor.draft'));
    await screen.findByText('promptEditor.draftFailed');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('只读态支持 maxHeight 与内部滚动样式（默认 360px）', () => {
    const value = '# 规范\n第一行\n第二行';
    const { container } = renderWithProviders(
      <PromptEditor value={value} readOnly />,
    );
    const scrollContainer = container.querySelector('.overflow-y-auto') as HTMLElement;
    expect(scrollContainer).toBeTruthy();
    expect(scrollContainer.style.maxHeight).toBe('360px');
    expect(scrollContainer.className).toContain('overscroll-contain');
  });
});
