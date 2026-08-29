/**
 * MarkdownEditor - 标准 Markdown 编辑器（输入 + 所见即所得预览）
 *
 * - preview="live"：输入区与渲染预览左右分栏实时预览（适合宽容器，如详情页描述）
 * - preview="toggle"：编辑/预览页签切换（适合窄容器，如评论框）
 * - preview="none"：纯输入（调用方自行处理展示）
 * - 输入区默认 AutoSizeTextarea；协议兼容的输入件（如 MentionTextarea）可通过
 *   renderInput 替换，协议：{ value, onChange(string), placeholder, rows, autoFocus, onKeyDown, className, ref }
 * - 底栏左侧为页签/提示文案，右侧为 actions（表情、发送按钮等调用方自定义动作）
 */
import { useState, type ReactElement, type ReactNode, type KeyboardEvent, type Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutoSizeTextarea } from '@/components/ui/property-panel';
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
}: {
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
}) {
  const { t } = useTranslation();
  const [showPreview, setShowPreview] = useState(false);
  const Input = renderInput ?? DefaultInput;
  const showLive = preview === 'live' && value.trim() !== '';
  const showToggledPreview = preview === 'toggle' && showPreview;

  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-background transition-colors focus-within:border-ring',
        className,
      )}
    >
      {showLive ? (
        <div className="grid grid-cols-2 divide-x divide-border/60">
          <Input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            rows={rows}
            autoFocus={autoFocus}
            onKeyDown={onKeyDown}
            className={cn(
              'w-full px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/50',
              inputClassName,
            )}
            ref={inputRef}
          />
          <div className="min-w-0 overflow-y-auto px-3 py-2">
            <MarkdownView content={value} />
          </div>
        </div>
      ) : showToggledPreview ? (
        <div className="min-h-13 px-3 py-2.5">
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
            'w-full px-3 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground/50',
            inputClassName,
          )}
          ref={inputRef}
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

function DefaultInput(props: MarkdownInputProps) {
  const { onChange, ...rest } = props;
  return <AutoSizeTextarea {...rest} onChange={(e) => onChange(e.target.value)} />;
}
