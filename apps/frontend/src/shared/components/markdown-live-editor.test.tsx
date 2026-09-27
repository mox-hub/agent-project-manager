/**
 * MarkdownLiveEditor 单测（CAP-A-04 增强切片）
 *
 * 覆盖：块切分纯函数（空行分块/围栏不裂/多空行归一/空内容）、
 * 块编辑交互（点击块进编辑、改块回写全文、Esc 回渲染态、尾部追加块）。
 * MarkdownView/SlashRefTextarea 以轻桩替换，聚焦组件自身接线。
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  MarkdownLiveEditor,
  splitMarkdownBlocks,
} from './markdown-live-editor';

vi.mock('./markdown-view', () => ({
  MarkdownView: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@/shared/entity-ref/slash-ref-textarea', () => ({
  SlashRefTextarea: (props: {
    value: string;
    onChange: (next: string) => void;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    className?: string;
    rows?: number;
    placeholder?: string;
    autoFocus?: boolean;
  }) => (
    <textarea
      value={props.value}
      rows={props.rows}
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
      className={props.className}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={(e) => props.onKeyDown?.(e)}
    />
  ),
}));

describe('splitMarkdownBlocks', () => {
  it('空行分块；连续多空行归一为块间分隔', () => {
    expect(splitMarkdownBlocks('段落一\n\n\n段落二')).toEqual([
      '段落一',
      '段落二',
    ]);
  });

  it('代码围栏整体不裂（围栏内空行保留）', () => {
    const content = '```js\nconst a = 1;\n\nconst b = 2;\n```\n\n后文';
    expect(splitMarkdownBlocks(content)).toHaveLength(2);
    expect(splitMarkdownBlocks(content)[0]).toContain('const b = 2;');
  });

  it('空/纯空白内容返回空数组', () => {
    expect(splitMarkdownBlocks('')).toEqual([]);
    expect(splitMarkdownBlocks('  \n \n')).toEqual([]);
  });
});

describe('MarkdownLiveEditor 交互', () => {
  it('非活跃块渲染为 MarkdownView；点击块切换为输入区', () => {
    const { container } = render(
      <MarkdownLiveEditor value={'第一段\n\n第二段'} onChange={vi.fn()} />,
    );

    expect(screen.getByText('第一段')).toBeTruthy();
    expect(screen.getByText('第二段')).toBeTruthy();
    expect(container.querySelectorAll('textarea')).toHaveLength(0);

    fireEvent.mouseDown(screen.getByText('第二段'));
    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).value).toBe('第二段');
  });

  it('编辑块内容回写全文（其余块保留，join 归一空行）', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MarkdownLiveEditor value={'第一段\n\n第二段'} onChange={onChange} />,
    );

    fireEvent.mouseDown(screen.getByText('第二段'));
    fireEvent.change(container.querySelector('textarea')!, {
      target: { value: '第二段改' },
    });

    expect(onChange).toHaveBeenCalledWith('第一段\n\n第二段改');
  });

  it('Esc 退出编辑回渲染态', () => {
    const { container } = render(
      <MarkdownLiveEditor value={'第一段'} onChange={vi.fn()} />,
    );

    fireEvent.mouseDown(screen.getByText('第一段'));
    expect(container.querySelector('textarea')).toBeTruthy();

    fireEvent.keyDown(container.querySelector('textarea')!, {
      key: 'Escape',
    });
    expect(container.querySelector('textarea')).toBeNull();
    expect(screen.getByText('第一段')).toBeTruthy();
  });

  it('空内容渲染占位输入区，输入即产生内容', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MarkdownLiveEditor value="" onChange={onChange} placeholder="添加描述…" />,
    );

    const textarea = container.querySelector('textarea');
    expect(textarea).toBeTruthy();
    expect((textarea as HTMLTextAreaElement).placeholder).toBe('添加描述…');

    fireEvent.change(textarea!, { target: { value: '首段内容' } });
    expect(onChange).toHaveBeenCalledWith('首段内容');
  });

  it('尾部 ghost 区追加空块进入编辑态，输入追加到文末', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MarkdownLiveEditor value={'第一段'} onChange={onChange} />,
    );

    const ghost = container.querySelector('button');
    expect(ghost).toBeTruthy();
    fireEvent.mouseDown(ghost);
    expect(container.querySelector('textarea')).toBeTruthy();

    fireEvent.change(container.querySelector('textarea')!, {
      target: { value: '新块' },
    });
    expect(onChange).toHaveBeenCalledWith('第一段\n\n新块');
  });
});
