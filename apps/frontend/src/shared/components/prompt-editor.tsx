/**
 * PromptEditor - 提示词编辑/查看复用组件（CAP-A-24）
 *
 * 分层提示词（系统/项目/角色/成员/团队/任务）的统一编辑与查看形态：
 * - 编辑态：MarkdownLiveEditor 块级「输入即渲染」所见即所得（点哪编哪，
 *   非活跃块恒为渲染态）；底部字数与保存/撤销动作槽。
 * - 只读态（readOnly）：MarkdownView 纯渲染 + 字数——系统级提示词
 *   内置资产唯一查看形态（无写端点，前端不提供改写通道）。
 * - 受控组件：value/onChange 由调用方持有，保存时机（自动/手动）由调用方定。
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { MarkdownLiveEditor } from './markdown-live-editor';
import { MarkdownView } from './markdown-view';

export function PromptEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  rows = 5,
  className,
  actions,
}: {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  /** 空内容占位输入区的初始行数 */
  rows?: number;
  className?: string;
  /** 底部动作区（保存/撤销等，仅编辑态显示） */
  actions?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const charCount = value.length;

  if (readOnly) {
    return (
      <div
        className={cn(
          'rounded-xl border border-border bg-muted/20 px-3 py-2.5',
          className,
        )}
        data-ai-component="shared.prompt-editor.readonly"
      >
        {value.trim() ? (
          <MarkdownView content={value} />
        ) : (
          <p className="text-sm text-muted-foreground/60">
            {placeholder ?? t('promptEditor.empty')}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground/60">
          {t('promptEditor.charCount', { count: charCount })}
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1.5', className)} data-ai-component="shared.prompt-editor">
      <MarkdownLiveEditor
        value={value}
        onChange={onChange ?? (() => {})}
        placeholder={placeholder}
        rows={rows}
        className="bg-background"
      />
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-xs text-muted-foreground/60">
          {t('promptEditor.charCount', { count: charCount })}
        </span>
        <div className="flex items-center gap-1">{actions}</div>
      </div>
    </div>
  );
}
