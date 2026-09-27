import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MarkdownEditor } from './markdown-editor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('./markdown-view', () => ({
  MarkdownView: ({ content }: { content: string }) => (
    <div data-testid="markdown-view">{content}</div>
  ),
}));

vi.mock('@/shared/entity-ref/slash-ref-textarea', () => ({
  SlashRefTextarea: (props: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    className?: string;
    style?: React.CSSProperties;
    ref?: React.Ref<HTMLTextAreaElement>;
  }) => (
    <textarea
      data-testid="slash-textarea"
      value={props.value}
      placeholder={props.placeholder}
      className={props.className}
      style={props.style}
      onChange={(e) => props.onChange(e.target.value)}
    />
  ),
}));

describe('MarkdownEditor', () => {
  it('默认编辑态：输入区携带默认 240px 最大高度限制与内部滚动样式', () => {
    const { container } = render(
      <MarkdownEditor value="测试内容" onChange={vi.fn()} />,
    );
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect(textarea?.style.maxHeight).toBe('240px');
    expect(textarea?.className).toContain('overflow-y-auto');
    expect(textarea?.className).toContain('overscroll-contain');
  });

  it('支持传入自定义 maxHeight 与 minHeight', () => {
    const { container } = render(
      <MarkdownEditor
        value="测试内容"
        onChange={vi.fn()}
        maxHeight={180}
        minHeight={80}
      />,
    );
    const textarea = container.querySelector('textarea');
    expect(textarea?.style.maxHeight).toBe('180px');
    expect(textarea?.style.minHeight).toBe('80px');
  });

  it('preview="toggle" 切换到预览态时，预览容器受 maxHeight 约束并带内部滚动', () => {
    render(
      <MarkdownEditor
        value="**加粗** 预览内容"
        onChange={vi.fn()}
        preview="toggle"
        maxHeight={200}
      />,
    );
    // 切换到预览
    fireEvent.click(screen.getByText('markdownEditor.preview'));
    const previewEl = screen.getByTestId('markdown-view').parentElement;
    expect(previewEl).toBeTruthy();
    expect(previewEl?.style.maxHeight).toBe('200px');
    expect(previewEl?.className).toContain('overflow-y-auto');
    expect(previewEl?.className).toContain('overscroll-contain');
  });

  it('preview="live" 分栏实时预览模式：左右分栏高度受 maxHeight 约束并内部滚动', () => {
    const { container } = render(
      <MarkdownEditor
        value="分栏内容"
        onChange={vi.fn()}
        preview="live"
        maxHeight={300}
      />,
    );
    const textarea = container.querySelector('textarea');
    expect(textarea?.style.maxHeight).toBe('300px');
    const previewContainer = screen.getByTestId('markdown-view').parentElement;
    expect(previewContainer?.style.maxHeight).toBe('300px');
    expect(previewContainer?.className).toContain('overflow-y-auto');
  });

  it('底栏动作区（actions）独立存在，不被输入区滚动吞没', () => {
    render(
      <MarkdownEditor
        value="内容"
        onChange={vi.fn()}
        actions={<button data-testid="send-btn">发送</button>}
      />,
    );
    expect(screen.getByTestId('send-btn')).toBeTruthy();
  });

  it('maxHeight 传 false 时不设高度上限', () => {
    const { container } = render(
      <MarkdownEditor value="内容" onChange={vi.fn()} maxHeight={false} />,
    );
    const textarea = container.querySelector('textarea');
    expect(textarea?.style.maxHeight).toBe('');
  });
});
