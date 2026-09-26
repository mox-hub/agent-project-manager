import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PromptEditor } from './prompt-editor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) =>
      opts && typeof opts.count === 'number' ? `${key}:${opts.count}` : key,
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('PromptEditor（CAP-A-24 提示词编辑/查看复用组件）', () => {
  it('只读态：渲染 markdown 正文与字数，无输入件', () => {
    const value = '# 项目约定\n提交前自测';
    renderWithProviders(<PromptEditor value={value} readOnly />);
    expect(screen.getByText('项目约定')).toBeTruthy();
    expect(screen.getByText('提交前自测')).toBeTruthy();
    expect(screen.getByText(`promptEditor.charCount:${value.length}`)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('只读态：空值显示占位而不渲染空 markdown', () => {
    renderWithProviders(<PromptEditor value="" readOnly placeholder="prompts.emptyHint" />);
    expect(screen.getByText('prompts.emptyHint')).toBeTruthy();
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
});
