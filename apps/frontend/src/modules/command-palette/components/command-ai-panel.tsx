// AI 命令面板组件
import React, { useState, useCallback, useEffect, memo } from 'react';
import * as Icons from 'lucide-react';
import { aiCommandTemplates } from '../services/preset-commands';
import type { AICommandTemplate } from '../types/command.types';
import { MentionTextarea } from '@/modules/team-member/components/mention-textarea';

interface CommandAIPanelProps {
  prompt: string;
  onSend: (prompt: string, template?: string) => void;
  onClose?: () => void;
}

export const CommandAIPanel = memo(function CommandAIPanel({
  prompt,
  onSend,
  onClose,
}: CommandAIPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 面板内联输入（支持 @ 提及成员），与主输入框 prompt 双轨
  const [draft, setDraft] = useState('');
  useEffect(() => {
    setDraft(prompt);
  }, [prompt]);

  // 过滤匹配的模板
  const matchedTemplates = aiCommandTemplates.filter(
    (t) =>
      t.label.toLowerCase().includes(prompt.toLowerCase()) ||
      t.prompt.toLowerCase().includes(prompt.toLowerCase())
  );

  const handleTemplateSelect = useCallback(
    (template: AICommandTemplate) => {
      // 使用模板的默认提示词
      onSend(template.prompt, template.id);
    },
    [onSend]
  );

  const handleSendCustom = useCallback(() => {
    const text = draft.trim() || prompt.trim();
    if (text) {
      onSend(text);
      setDraft('');
    }
  }, [draft, prompt, onSend]);

  return (
    <div className="border-t border-border">
      {/* 自定义输入区 */}
      <div className="flex items-start gap-2 border-b border-border/50 px-3 py-2">
        <Icons.Sparkles className="h-4 w-4 shrink-0 mt-2 text-accent-purple" />
        <MentionTextarea
          value={draft}
          onChange={setDraft}
          rows={1}
          placeholder="输入 AI 命令或问题，@ 可提及成员…"
          className="flex-1 [&_textarea]:bg-transparent [&_textarea]:border-0 [&_textarea]:px-0 [&_textarea]:py-1.5 [&_textarea]:text-sm [&_textarea]:focus-visible:border-0"
          onEnterSubmit={handleSendCustom}
        />
        <button
          type="button"
          onClick={handleSendCustom}
          disabled={!(draft.trim() || prompt.trim())}
          className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-accent-purple px-2 py-1 text-xs font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          <Icons.Send className="h-3 w-3" />
          发送
        </button>
      </div>

      {/* AI 模板列表 */}
      {matchedTemplates.length > 0 && (
        <div className="max-h-50 overflow-y-auto p-2">
          <div className="text-10 font-semibold uppercase tracking-wider text-muted-foreground px-1 py-1">
            AI 快捷命令
          </div>
          <div className="space-y-1">
            {matchedTemplates.map((template) => {
              const Icon = Icons[template.icon as keyof typeof Icons] as React.ComponentType<{
                className?: string;
              }>;
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">{template.label}</span>
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {template.prompt.slice(0, 50)}...
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 提示信息 */}
      <div className="px-3 py-2 text-xs text-muted-foreground">
        <p>
          输入 <code className="rounded bg-muted px-1">/ai</code> 开始 AI 命令，
          或直接输入问题与 AI 对话
        </p>
      </div>
    </div>
  );
});

/**
 * AI 命令建议
 */
export function AICommandSuggestions({
  onSelect,
}: {
  onSelect: (template: AICommandTemplate) => void;
}) {
  const suggestions = aiCommandTemplates.slice(0, 4);

  return (
    <div className="flex flex-wrap gap-2 p-2">
      {suggestions.map((template) => {
        const Icon = Icons[template.icon as keyof typeof Icons] as React.ComponentType<{
          className?: string;
        }>;
        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-accent-purple hover:text-accent-purple"
          >
            <Icons.Sparkles className="h-3 w-3" />
            {template.label}
          </button>
        );
      })}
    </div>
  );
}
