import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MemberAvatar } from './member-avatar';
import { TrustLevelBadge } from './trust-level-badge';
import {
  Bot,
  Circle,
  Clock,
  Copy,
  Check,
  Mail,
  Phone,
  MapPin,
  Tag,
  Folder,
  Users,
  Zap,
} from 'lucide-react';
import { useMemberCard } from '../hooks';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export interface MemberCardPopoverProps {
  memberId: string;
  projectId?: string;
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const STATUS_DOT: Record<string, string> = {
  active: 'bg-accent-green',
  inactive: 'bg-muted-foreground',
  suspended: 'bg-accent-yellow',
};

function formatTime(iso: string | null): string {
  if (!iso) return '从未';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return d.toLocaleDateString();
}

function activityLabel(type: string): string {
  switch (type) {
    case 'login':
      return '登录';
    case 'logout':
      return '登出';
    case 'status_changed':
      return '状态变更';
    case 'assigned':
      return '被指派';
    case 'commented':
      return '发表评论';
    case 'executed':
      return '执行任务';
    default:
      return type;
  }
}

export function MemberCardPopover({
  memberId,
  projectId,
  trigger,
  children,
  side = 'bottom',
  align = 'start',
  className,
}: MemberCardPopoverProps) {
  const { data: card, isLoading, error } = useMemberCard(memberId, projectId);
  const [copied, setCopied] = useState(false);

  const copyShortId = async () => {
    if (!card) return;
    try {
      await navigator.clipboard.writeText(card.shortId);
      setCopied(true);
      toast.success(`已复制短 ID: ${card.shortId}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('复制失败');
    }
  };

  const content = (
    <div className={cn('w-80 max-w-[90vw] p-4', className)}>
      {isLoading && (
        <div className="text-sm text-muted-foreground">加载中…</div>
      )}
      {error && (
        <div className="text-sm text-accent-red">加载失败</div>
      )}
      {card && (
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <MemberAvatar
              member={{
                type: card.type,
                displayName: card.displayName,
                handle: card.handle,
                avatarUrl: card.avatarUrl,
                isOnline: card.isOnline,
              }}
              size="lg"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm truncate">{card.displayName}</h3>
                {card.type === 'ai_agent' && (
                  <Bot className="h-3.5 w-3.5 text-accent-purple shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="truncate">@{card.handle}</span>
                {card.title && (
                  <>
                    <span>·</span>
                    <span className="truncate">{card.title}</span>
                  </>
                )}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    STATUS_DOT[card.status] || 'bg-muted-foreground',
                  )}
                />
                <span>{card.isOnline ? '在线' : '离线'}</span>
                <span>·</span>
                <Clock className="h-3 w-3" />
                <span>{formatTime(card.lastActiveAt)}</span>
              </div>
            </div>
          </div>

          {/* Trust + shortId */}
          <div className="flex items-center justify-between gap-2">
            <TrustLevelBadge level={card.trustLevel} score={card.trustScore} />
            <button
              type="button"
              onClick={copyShortId}
              title="复制短 ID"
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {card.shortId}
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          {card.bio && (
            <p className="text-xs text-muted-foreground line-clamp-2">{card.bio}</p>
          )}

          {/* Tags */}
          {card.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {card.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                >
                  <Tag className="h-2.5 w-2.5" />
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Contact / AI Model */}
          <div className="space-y-1 text-[11px]">
            {card.type === 'human' && card.email && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="truncate">{card.email}</span>
              </div>
            )}
            {card.type === 'human' && card.phone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Phone className="h-3 w-3" />
                <span>{card.phone}</span>
              </div>
            )}
            {card.type === 'human' && card.timezone && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span>{card.timezone}</span>
              </div>
            )}
            {card.type === 'ai_agent' && card.aiModel && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Bot className="h-3 w-3 text-accent-purple" />
                <span>
                  {card.aiModel.name} · {card.aiModel.provider}
                </span>
              </div>
            )}
            {card.type === 'ai_agent' && card.hasPersonalPrompt && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Tag className="h-3 w-3" />
                <span>已配置个人提示词</span>
              </div>
            )}
            {card.type === 'ai_agent' && card.thinkingLevel && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Zap className="h-3 w-3" />
                <span>思考强度: {card.thinkingLevel}</span>
              </div>
            )}
          </div>

          {/* Load */}
          {card.load.total > 0 && (
            <div className="flex items-center gap-3 text-[11px] pt-1 border-t border-border/60">
              <span className="text-muted-foreground">负载</span>
              <span className="text-accent-yellow">
                待办 <b>{card.load.todo}</b>
              </span>
              <span className="text-accent-blue">
                进行 <b>{card.load.inProgress}</b>
              </span>
              <span className="text-accent-green">
                完成 <b>{card.load.completed}</b>
              </span>
            </div>
          )}

          {/* Projects */}
          {card.projects.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/60">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Folder className="h-2.5 w-2.5" />
                参与项目
              </div>
              <div className="flex flex-wrap gap-1">
                {card.projects.slice(0, 5).map((p) => (
                  <Link
                    key={p.projectId}
                    to={`/app/projects/${p.projectId}`}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted text-foreground hover:bg-muted/70"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: p.color || '#5E6AD2' }}
                    />
                    {p.projectName}
                    <span className="text-muted-foreground">· {p.role}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Teams */}
          {card.teams.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/60">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Users className="h-2.5 w-2.5" />
                所属团队
              </div>
              <div className="flex flex-wrap gap-1">
                {card.teams.slice(0, 4).map((t) => (
                  <span
                    key={t.teamId}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-accent-purple/10 text-accent-purple"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: t.color || '#5E6AD2' }}
                    />
                    {t.teamName}
                    <span className="text-muted-foreground">· {t.role}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent activities */}
          {card.recentActivities.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/60">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                最近活动
              </div>
              <ul className="space-y-0.5">
                {card.recentActivities.slice(0, 3).map((a) => (
                  <li
                    key={a.id}
                    className="text-[11px] text-muted-foreground flex items-center justify-between gap-2"
                  >
                    <span className="truncate">{activityLabel(a.type)}</span>
                    <span className="text-[10px] shrink-0">
                      {formatTime(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Link to detail */}
          <div className="pt-2 border-t border-border/60">
            <Link
              to={`/app/members/${card.id}`}
              className="text-[11px] text-primary hover:underline"
            >
              查看完整档案 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger>
        {trigger || children || (
          <button
            type="button"
            className="inline-flex items-center"
            aria-label="Member card"
          >
            <MemberAvatar
              member={
                card
                  ? {
                      type: card.type,
                      displayName: card.displayName,
                      handle: card.handle,
                      avatarUrl: card.avatarUrl,
                      isOnline: card.isOnline,
                    }
                  : undefined
              }
            />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent side={side} align={align} className="p-0">
        {content}
      </PopoverContent>
    </Popover>
  );
}
