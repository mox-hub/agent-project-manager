/**
 * MarkdownLiveEditor - 块级所见即所得 Markdown 编辑器（输入与渲染同屏，无分栏）
 *
 * - 内容按空行切分为块（代码围栏整体不裂）：非活跃块恒为 MarkdownView 渲染态，
 *   点击块就地换成无边框输入区，其余块保持渲染；失焦 / Esc / 点击别的块回渲染态。
 *   区别于 MarkdownEditor preview="live" 的左右分栏，适合详情页描述区这类
 *   「看即所得、点哪编哪」的场景（CAP-A-04 增强切片）。
 * - 输入件统一 SlashRefTextarea（自动增高 + `/` 触发全局实体引用补全，
 *   CAP-A-23）；早期曾因 @提及的 Enter 语义冲突有意不接补全，`/` 词元补全
 *   无提交语义冲突（菜单关着时按键全透传），描述区即恢复引用能力。
 * - 编辑态以块为粒度：正在编辑的块内显示 markdown 源文，失焦即整块渲染；
 *   块间分隔统一归一为空行（连续多空行在下一次编辑落盘时收敛为一个空行）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { SlashRefTextarea } from '@/shared/entity-ref/slash-ref-textarea';
import { MarkdownView } from './markdown-view';

/**
 * 把 markdown 源文切分为顶层块：空行（含纯空白行）为界；
 * ``` / ~~~ 围栏内的空行不切分，围栏整体保持一个块。
 */
export function splitMarkdownBlocks(content: string): string[] {
  if (!content.trim()) return [];
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];
  let current: string[] = [];
  let fenceMarker: string | null = null;
  for (const line of lines) {
    const fence = line.match(/^\s*(```|~~~)/);
    if (fence) {
      if (!fenceMarker) {
        fenceMarker = fence[1];
      } else if (line.trim().startsWith(fenceMarker)) {
        fenceMarker = null;
      }
    }
    if (!fenceMarker && line.trim() === '') {
      if (current.length > 0) {
        blocks.push(current.join('\n'));
        current = [];
      }
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) blocks.push(current.join('\n'));
  return blocks;
}

export interface MarkdownLiveEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** 空内容占位输入区的初始行数 */
  rows?: number;
  className?: string;
  inputClassName?: string;
  /** 编辑器最大高度（数值 px 或 CSS 长度串，例如 320、'320px'、'20rem'；传入 false 或 'none' 为不限制），超限时在组件内滚动；缺省为 320px */
  maxHeight?: number | string | false | null;
  /** 编辑器最小高度（数值 px 或 CSS 长度串） */
  minHeight?: number | string;
}

export function MarkdownLiveEditor({
  value,
  onChange,
  placeholder,
  rows = 2,
  className,
  inputClassName,
  maxHeight = 320,
  minHeight,
}: MarkdownLiveEditorProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const blocks = useMemo(() => splitMarkdownBlocks(value), [value]);
  // 追加块态：activeIndex 指向 blocks 末尾的空位（blocks.length），先给空 textarea 再落内容
  const appending = activeIndex !== null && activeIndex >= blocks.length;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevActiveRef = useRef<number | null>(null);

  const resolvedMaxHeight =
    maxHeight === false || maxHeight === null || maxHeight === 'none'
      ? undefined
      : typeof maxHeight === 'number'
        ? `${maxHeight}px`
        : maxHeight;

  const resolvedMinHeight =
    typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  // 块切换后把焦点与光标落到新输入区末尾（点哪编哪，光标在块尾续写）
  useEffect(() => {
    const prev = prevActiveRef.current;
    prevActiveRef.current = activeIndex;
    if (activeIndex === null || activeIndex === prev) return;
    const el = containerRef.current?.querySelector<HTMLTextAreaElement>('textarea');
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [activeIndex]);

  const replaceBlock = (index: number, next: string) => {
    const nextBlocks = [...blocks];
    nextBlocks[index] = next;
    const joined = nextBlocks.join('\n\n');
    if (joined.trim() === '') {
      // 全部清空：回到占位态，避免空块残留
      setActiveIndex(null);
      onChange('');
      return;
    }
    onChange(joined);
  };

  const appendBlock = () => {
    if (value.trim() === '') return;
    setActiveIndex(blocks.length);
  };

  const isEmpty = blocks.length === 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex flex-col',
        resolvedMaxHeight && 'overflow-y-auto overscroll-contain pr-1',
        className,
      )}
      style={{
        maxHeight: resolvedMaxHeight,
        minHeight: resolvedMinHeight,
      }}
      onBlur={(e) => {
        // 焦点离开编辑器整体（块内失焦）即回渲染态；块间切换走 mousedown 抢先换块不经 blur
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setActiveIndex(null);
        }
      }}
    >
      {blocks.map((block, i) =>
        i === activeIndex ? (
          <SlashRefTextarea
            key={i}
            value={block}
            rows={Math.max(rows, block.split('\n').length)}
            onChange={(next) => replaceBlock(i, next)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') e.currentTarget.blur();
            }}
            className={cn(
              'w-full border-0 bg-transparent px-0 py-0.5 text-sm leading-relaxed shadow-none focus-visible:ring-0',
              inputClassName,
            )}
          />
        ) : (
          <div
            key={i}
            // mousedown 抢先换块并阻止焦点转移：绕开「blur 置空 → click 目标已被重渲染」竞态
            onMouseDown={(e) => {
              e.preventDefault();
              setActiveIndex(i);
            }}
            className="-mx-1.5 cursor-text rounded-md px-1.5 py-0.5 transition-colors hover:bg-muted/40"
          >
            <MarkdownView content={block} />
          </div>
        ),
      )}

      {appending && (
        <SlashRefTextarea
          value=""
          rows={rows}
          autoFocus
          placeholder={placeholder}
          onChange={(next) => replaceBlock(blocks.length, next)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          className={cn(
            'w-full border-0 bg-transparent px-0 py-0.5 text-sm leading-relaxed shadow-none focus-visible:ring-0',
            inputClassName,
          )}
        />
      )}

      {/* 尾部追加区：占位态（无块）时即描述输入本体；有内容时为 ghost 追加行 */}
      {isEmpty ? (
        <SlashRefTextarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(next) => {
            setActiveIndex(0);
            onChange(next);
          }}
          className={cn(
            'w-full border-0 bg-transparent px-0 py-0.5 text-sm leading-relaxed placeholder:text-muted-foreground/50 shadow-none focus-visible:ring-0',
            inputClassName,
          )}
        />
      ) : (
        !appending && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              appendBlock();
            }}
            className="-mx-1.5 mt-0.5 min-h-7 cursor-text rounded-md px-1.5 py-0.5 text-left text-sm text-transparent transition-colors hover:bg-muted/40"
            aria-label={placeholder}
          />
        )
      )}
    </div>
  );
}
