import { useState, type MouseEvent } from 'react';
import {
  AlertCircle,
  Archive,
  Bot,
  Bug,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  FileText,
  Mail,
  MailOpen,
  RotateCcw,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ActionableInboxItem, ActionTone } from '../types/inbox';

export interface InboxItemRowProps {
  item: ActionableInboxItem;
  isSelected: boolean;
  onSelect: (item: ActionableInboxItem) => void;
  onClear: (id: string) => void;
  onRestore: (id: string) => void;
  onSnooze: (id: string, durationMs: number) => void;
  onToggleRead?: (item: ActionableInboxItem) => void;
}

function getIssueStatusIcon(status?: string) {
  switch (status) {
    case 'done':
      return <CheckCircle2 className="size-3.5 text-accent-purple" />;
    case 'blocked':
      return <AlertCircle className="size-3.5 text-accent-red" />;
    case 'in_progress':
    case 'in_review':
      return <Clock className="size-3.5 text-accent-green animate-pulse" />;
    default:
      return <Clock className="size-3.5 text-muted-foreground" />;
  }
}

function getIssueTypeIcon(type?: string) {
  switch (type) {
    case 'bug':
      return <Bug className="size-3.5 text-accent-red" />;
    case 'decision':
      return <Zap className="size-3.5 text-accent-yellow" />;
    case 'acceptance':
      return <Sparkles className="size-3.5 text-accent-purple" />;
    case 'doc':
      return <FileText className="size-3.5 text-accent-blue" />;
    default:
      return <CheckSquare className="size-3.5 text-accent-blue" />;
  }
}

function getActionTagClass(tone?: ActionTone) {
  switch (tone) {
    case 'danger':
      return 'bg-accent-red-light text-accent-red border-accent-red/20';
    case 'warning':
      return 'bg-accent-yellow-light text-accent-yellow border-accent-yellow/20';
    case 'purple':
      return 'bg-accent-purple-light text-accent-purple border-accent-purple/20';
    case 'blue':
      return 'bg-accent-blue-light text-accent-blue border-accent-blue/20';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function formatRelativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

export function InboxItemRow({
  item,
  isSelected,
  onSelect,
  onClear,
  onRestore,
  onSnooze,
  onToggleRead,
}: InboxItemRowProps) {
  const [snoozeMenuOpen, setSnoozeMenuOpen] = useState(false);

  const handleClearClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (item.isCleared) {
      onRestore(item.id);
    } else {
      onClear(item.id);
    }
  };

  const handleReadClick = (e: MouseEvent) => {
    e.stopPropagation();
    onToggleRead?.(item);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      className={cn(
        'group relative flex items-center gap-2.5 border-b border-border/60 px-3 py-2.5 text-left transition-colors cursor-pointer select-none',
        'hover:bg-accent/60',
        isSelected && 'bg-accent text-accent-foreground shadow-2xs',
        item.isUnread && !isSelected && 'bg-accent/15',
      )}
    >
      {/* 1. 未读状态小红点 */}
      <div className="flex size-2 shrink-0 items-center justify-center">
        {item.isUnread ? (
          <span className="size-1.5 rounded-full bg-accent-red shadow-xs" />
        ) : (
          <span className="size-1.5 rounded-full bg-transparent" />
        )}
      </div>

      {/* 2. 工单执行状态指示环 */}
      <div className="flex shrink-0 items-center justify-center">
        {getIssueStatusIcon(item.issueStatus)}
      </div>

      {/* 3. 工单类型小图标 */}
      <div className="flex shrink-0 items-center justify-center">
        {getIssueTypeIcon(item.issueType)}
      </div>

      {/* 4. 标题与行动标签 */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className={cn(
            'truncate text-sm',
            item.isUnread ? 'font-medium text-foreground' : 'text-content-text-secondary',
            isSelected && 'text-accent-foreground font-semibold',
          )}
          title={item.title}
        >
          {item.title}
        </span>

        {/* 关键行动高亮 Tag（等待回复 / 等待审阅 / 等待验收 / 指派给你） */}
        {item.actionTag && (
          <span
            className={cn(
              'shrink-0 rounded border px-1.5 py-0.5 text-10 font-semibold leading-none shadow-2xs',
              getActionTagClass(item.actionTag.tone),
            )}
          >
            {item.actionTag.label}
          </span>
        )}
      </div>

      {/* 5. 触发者/Agent 身份与动态文字 */}
      {item.actor && (
        <div className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex max-w-[240px] truncate">
          <div
            className={cn(
              'flex size-4 shrink-0 items-center justify-center rounded-full text-10',
              item.actor.isAgent ? 'bg-accent-purple/15 text-accent-purple' : 'bg-muted text-muted-foreground',
            )}
          >
            {item.actor.isAgent ? <Bot className="size-2.5" /> : <User className="size-2.5" />}
          </div>
          <span className="truncate">
            <strong className="font-medium text-foreground/85">{item.actor.name}</strong>
            <span className="ml-1 text-content-text-muted">{item.actor.actionText}</span>
          </span>
        </div>
      )}

      {/* 6. 时间戳（常规展示，悬停时隐藏或让位给快捷操作栏） */}
      <div className="shrink-0 text-right text-xs text-content-text-muted transition-opacity group-hover:opacity-0 w-14">
        {formatRelativeTime(item.createdAt)}
      </div>

      {/* 7. 悬停快捷浮动工具条（Hover Actions） */}
      <div
        className={cn(
          'absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 transition-opacity pointer-events-none z-10',
          'group-hover:opacity-100 group-hover:pointer-events-auto',
          snoozeMenuOpen && 'opacity-100 pointer-events-auto',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标记已读/未读 */}
        <Button
          variant="ghost"
          size="icon"
          className="size-7 rounded-md bg-background/90 shadow-xs hover:bg-muted"
          title={item.isUnread ? '标记已读' : '标记未读'}
          aria-label={item.isUnread ? '标记已读' : '标记未读'}
          onClick={handleReadClick}
        >
          {item.isUnread ? <MailOpen className="size-3.5 text-muted-foreground" /> : <Mail className="size-3.5 text-muted-foreground" />}
        </Button>

        {/* 稍后处理（Snooze） */}
        {!item.isCleared && (
          <DropdownMenu open={snoozeMenuOpen} onOpenChange={setSnoozeMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7 rounded-md bg-background/90 shadow-xs hover:bg-muted"
                title="稍后提醒"
                aria-label="稍后提醒"
              >
                <Clock className="size-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuItem onClick={() => onSnooze(item.id, 60 * 60 * 1000)}>
                <Clock className="mr-2 size-3.5" />
                1 小时后
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(item.id, 3 * 60 * 60 * 1000)}>
                <Clock className="mr-2 size-3.5" />
                3 小时后
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSnooze(item.id, 24 * 60 * 60 * 1000)}>
                <Clock className="mr-2 size-3.5" />
                明天上午
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* 清理 / 恢复 */}
        <Button
          variant={item.isCleared ? 'outline' : 'secondary'}
          size="sm"
          className={cn(
            'h-7 gap-1 px-2 text-xs font-medium shadow-xs',
            item.isCleared
              ? 'border-border text-foreground hover:bg-muted'
              : 'bg-foreground text-background hover:bg-foreground/90',
          )}
          title={item.isCleared ? '恢复至收件箱' : '清理此项'}
          aria-label={item.isCleared ? '恢复至收件箱' : '清理此项'}
          onClick={handleClearClick}
        >
          {item.isCleared ? (
            <>
              <RotateCcw className="size-3" />
              <span>恢复</span>
            </>
          ) : (
            <>
              <Check className="size-3" />
              <span>清理</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
