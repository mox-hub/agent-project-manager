/**
 * MarkdownEditor - 标准 Markdown 编辑器（输入 + 所见即所得预览）
 *
 * - preview="live"：输入区与渲染预览左右分栏实时预览（适合宽容器，如详情页描述）
 * - preview="toggle"：编辑/预览页签切换（适合窄容器，如评论框）
 * - preview="none"：纯输入（调用方自行处理展示）
 * - 输入区默认 SlashRefTextarea（`/` 触发全局实体引用补全，CAP-A-23）；
 *   协议兼容的输入件可通过 renderInput 替换，协议：
 *   { value, onChange(string), placeholder, rows, autoFocus, onKeyDown, className, ref }
 * - 底栏左侧为页签/提示文案，右侧为 actions（表情、发送按钮等调用方自定义动作）
 */
import { useState, type ReactElement, type ReactNode, type KeyboardEvent, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SlashRefTextarea } from '@/shared/entity-ref/slash-ref-textarea';
import { Button } from '@/components/ui/button';
import { MarkdownView } from './markdown-view';

export interface MarkdownInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  ref?: Ref<HTMLTextAreaElement>;
  style?: React.CSSProperties;
}

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  preview?: 'live' | 'toggle' | 'none';
  /** 底栏左侧提示文案（仅非 toggle 模式显示） */
  hint?: string;
  /** 底栏右侧动作区 */
  actions?: ReactNode;
  renderInput?: (props: MarkdownInputProps) => ReactElement;
  className?: string;
  inputClassName?: string;
  inputRef?: Ref<HTMLTextAreaElement>;
  /** 编辑器内容区域最大高度（数值 px 或 CSS 长度串，例如 240、'240px'、'16rem'；传入 false 或 'none' 为不限制），超限时在组件内滚动；缺省为 240px */
  maxHeight?: number | string | false | null;
  /** 编辑器内容区域最小高度（数值 px 或 CSS 长度串） */
  minHeight?: number | string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  rows = 3,
  autoFocus,
  onKeyDown,
  preview = 'toggle',
  hint,
  actions,
  renderInput,
  className,
  inputClassName,
  inputRef,
  maxHeight = 240,
  minHeight,
}: MarkdownEditorProps) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);
  const Input = renderInput ?? SlashRefTextarea;
  const showLive = preview === 'live' && value.trim() !== '';
  const showToggledPreview = preview === 'toggle' && showPreview;

  const resolvedMaxHeight =
    maxHeight === false || maxHeight === null || maxHeight === 'none'
      ? undefined
      : typeof maxHeight === 'number'
        ? `${maxHeight}px`
        : maxHeight;

  const resolvedMinHeight =
    typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  const contentStyle: React.CSSProperties = {
    maxHeight: resolvedMaxHeight,
    minHeight: resolvedMinHeight,
  };

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-background transition-colors focus-within:border-ring',
        className,
      )}
    >
      {showLive ? (
        <div
          className="grid grid-cols-2 divide-x divide-border/60 overflow-hidden"
          style={contentStyle}
        >
          <div
            className="min-w-0 overflow-y-auto overscroll-contain"
            style={contentStyle}
          >
            <Input
              value={value}
              onChange={onChange}
              placeholder={placeholder}
              rows={rows}
              autoFocus={autoFocus}
              onKeyDown={onKeyDown}
              className={cn(
                'w-full px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/50 overflow-y-auto overscroll-contain',
                inputClassName,
              )}
              ref={inputRef}
              style={contentStyle}
            />
          </div>
          <div
            className="min-w-0 overflow-y-auto overscroll-contain px-3 py-2"
            style={contentStyle}
          >
            <MarkdownView content={value} />
          </div>
        </div>
      ) : showToggledPreview ? (
        <div
          className="min-h-13 overflow-y-auto overscroll-contain px-3 py-2.5"
          style={contentStyle}
        >
          {value.trim() ? (
            <MarkdownView content={value} />
          ) : (
            <div className="text-sm text-muted-foreground/50">{t('markdownEditor.nothingToPreview')}</div>
          )}
        </div>
      ) : (
        <Input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={rows}
          autoFocus={autoFocus}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/50 overflow-y-auto overscroll-contain',
            inputClassName,
          )}
          ref={inputRef}
          style={contentStyle}
        />
      )}

      {(preview === 'toggle' || hint || actions) && (
        <div className="flex items-center justify-between gap-1 px-2 pb-2">
          {preview === 'toggle' ? (
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowPreview(false)}
                className={cn(!showPreview && 'text-foreground')}
              >
                <Pencil className="size-3" />
                {t('markdownEditor.write')}
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setShowPreview(true)}
                className={cn(showPreview && 'text-foreground')}
              >
                <Eye className="size-3" />
                {t('markdownEditor.preview')}
              </Button>
            </div>
          ) : hint ? (
            <span className="text-10 text-muted-foreground/60">{hint}</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-1">{actions}</div>
        </div>
      )}
    </div>
  );
}
