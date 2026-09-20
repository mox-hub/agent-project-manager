import { useMemo, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import { MemberAvatar } from './member-avatar';
import {
  buildInsertText,
  useEntityRefSuggestions,
  type EntityRefCandidate,
} from '@/shared/entity-ref/entity-ref-suggest';

export interface SuggestedMember {
  id: string;
  type: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  /** 文档候选搜索范围与 apm:// 短号链接的项目代码（统一实体引用子系统，v2 纪要 §13.3） */
  projectId?: string;
  projectCode?: string;
  /** 命中成员选中时的回调（可用于联动解析 Mention 记录；仅成员候选触发） */
  onMentionSelected?: (member: SuggestedMember) => void;
  /** 无候选列表时按 Enter 触发（用于聊天式输入的直接发送） */
  onEnterSubmit?: () => void;
}

const TOKEN_RE = /@([a-zA-Z0-9_\-.]*)$/;

/**
 * 支持 @ 触发统一实体引用补全的文本域（v2 纪要 §13.3 重构）：
 * 光标前输入 @query 时弹出统一候选列表（成员 + 项目文档混排同源），
 * 成员以 `@handle ` 插入（兼容提及解析），文档以 markdown 链接插入
 * （apm:// 短号形态优先，渲染侧由 apm-ref-chip 呈现为同一 chip）。
 */
export function MentionTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className,
  disabled,
  projectId,
  projectCode,
  onMentionSelected,
  onEnterSubmit,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { candidates } = useEntityRefSuggestions({
    query: query ?? '',
    enabled: query !== null,
    projectId,
    projectCode,
  });

  const list = useMemo(() => candidates, [candidates]);

  const detectToken = (text: string, caret: number) => {
    const upToCaret = text.slice(0, caret);
    const match = TOKEN_RE.exec(upToCaret);
    setQuery(match ? match[1] : null);
    setActiveIndex(0);
  };

  const applySelection = (candidate: EntityRefCandidate) => {
    const el = textareaRef.current;
    const text = value;
    const caret = el?.selectionStart ?? text.length;
    const upToCaret = text.slice(0, caret);
    const match = TOKEN_RE.exec(upToCaret);
    if (!match) return;
    const start = match.index;
    const inserted = buildInsertText(candidate, { projectCode });
    const next = text.slice(0, start) + inserted + text.slice(caret);
    onChange(next);
    setQuery(null);
    if (candidate.kind === 'member') {
      onMentionSelected?.({
        id: candidate.id,
        type: candidate.memberType,
        handle: candidate.handle,
        displayName: candidate.displayName,
        avatarUrl: candidate.avatarUrl,
      });
    }
    // 恢复光标到插入内容之后
    requestAnimationFrame(() => {
      const pos = start + inserted.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (query !== null && list.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % list.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + list.length) % list.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySelection(list[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setQuery(null);
        return;
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onEnterSubmit?.();
    }
  };

  return (
    <div className={cn('relative', className)}>
      <textarea
        ref={textareaRef}
        value={value}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          detectToken(e.target.value, e.target.selectionStart ?? 0);
        }}
        onClick={(e) =>
          detectToken(
            (e.target as HTMLTextAreaElement).value,
            (e.target as HTMLTextAreaElement).selectionStart ?? 0,
          )
        }
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // 延迟关闭以允许点击列表项
          setTimeout(() => setQuery(null), 150);
        }}
        className={cn(
          'w-full px-2.5 py-2 rounded-md border border-input bg-background text-sm resize-none',
          'placeholder:text-muted-foreground focus-visible:border-accent-blue focus-visible:outline-hidden',
          disabled && 'opacity-50',
        )}
      />
      {query !== null && list.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 rounded-md border border-border bg-popover text-popover-foreground shadow-md overflow-hidden">
          <ul className="max-h-56 overflow-y-auto py-1">
            {list.map((candidate, i) => (
              <li key={`${candidate.kind}-${candidate.id}`}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm',
                    i === activeIndex ? 'bg-accent-blue/10' : 'hover:bg-muted/60',
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applySelection(candidate);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                >
                  {candidate.kind === 'member' ? (
                    <>
                      <MemberAvatar
                        member={{
                          type: candidate.memberType as 'human' | 'ai_agent',
                          displayName: candidate.displayName,
                          handle: candidate.handle,
                          avatarUrl: candidate.avatarUrl,
                          isOnline: false,
                        }}
                        size="xs"
                        showBadge={false}
                      />
                      <span className="truncate">{candidate.displayName}</span>
                      <span className="text-11 text-muted-foreground truncate">
                        @{candidate.handle}
                      </span>
                      {candidate.memberType === 'ai_agent' && (
                        <Bot className="ml-auto h-3 w-3 text-accent-purple shrink-0" />
                      )}
                    </>
                  ) : (
                    <>
                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate">{candidate.title}</span>
                      <span className="text-11 text-muted-foreground ml-auto shrink-0">
                        文档
                      </span>
                    </>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
