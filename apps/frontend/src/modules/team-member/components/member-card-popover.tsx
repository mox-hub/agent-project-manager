import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { MemberAvatar } from './member-avatar';
import { Bot, Circle, Clock, Mail, Phone, MapPin, Tag, Folder, Users } from 'lucide-react';
import { useMemberCard } from '../hooks';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

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
  active: 'bg-emerald-500',
  inactive: 'bg-gray-400',
  suspended: 'bg-amber-500',
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

  const content = (
    <div className={cn('w-80 max-w-[90vw] p-4', className)}>
      {isLoading && (
        <div className="text-sm text-muted-foreground">加载中…</div>
      )}
      {error && (
        <div className="text-sm text-red-500">加载失败</div>
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
                  <Bot className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">@{card.handle}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    STATUS_DOT[card.status] || 'bg-gray-400',
                  )}
                />
                <span>{card.isOnline ? '在线' : '离线'}</span>
                <span>·</span>
                <Clock className="h-3 w-3" />
                <span>{formatTime(card.lastActiveAt)}</span>
              </div>
            </div>
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
                <Bot className="h-3 w-3 text-violet-500" />
                <span>
                  {card.aiModel.name} · {card.aiModel.provider}
                </span>
              </div>
            )}
          </div>

          {/* Load */}
          {card.load.total > 0 && (
            <div className="flex items-center gap-3 text-[11px] pt-1 border-t border-border/60">
              <span className="text-muted-foreground">负载</span>
              <span className="text-amber-500">
                待办 <b>{card.load.todo}</b>
              </span>
              <span className="text-blue-500">
                进行 <b>{card.load.inProgress}</b>
              </span>
              <span className="text-emerald-500">
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
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-700"
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
