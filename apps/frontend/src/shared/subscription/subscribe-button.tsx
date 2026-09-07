/**
 * SubscribeButton - 页面订阅按钮（收藏按钮右侧，参考 Linear 订阅者交互）。
 * 收起态：订阅者头像栈（无订阅者时人形加号图标）；点击弹出订阅者管理浮层：
 * 搜索过滤 + 成员/智能体两组勾选（图1），勾选即全量替换订阅者集合。
 * 作用域按当前路由自动推导（详情页/项目页），无法推导时不渲染。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserRoundPlus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { listMembers } from '@/modules/team-member/api/team-member-api';
import type { Member } from '@/shared/member/types';
import {
  useMySubscriptions,
  useRouteSubscriptionScope,
  useSetSubscribers,
  useSubscribers,
} from './use-subscription';

interface SubscribeButtonProps {
  className?: string;
}

export function SubscribeButton({ className }: SubscribeButtonProps) {
  const { t } = useTranslation();
  const scope = useRouteSubscriptionScope();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data } = useSubscribers(scope);
  const { data: my } = useMySubscriptions();
  const setMutation = useSetSubscribers(scope ?? { entityType: '-', entityId: '-' });

  // 弹层打开时拉取全量成员（人类 + 智能体），勾选即替换订阅者集合
  const { data: allMembers } = useQuery({
    queryKey: ['members', 'for-subscribe'],
    queryFn: () => listMembers({ status: 'active', limit: 200 }),
    enabled: open,
    staleTime: 60 * 1000,
  });

  if (!scope) return null;

  const subscribers = data?.items ?? [];
  const myMemberId = my?.memberId ?? null;
  const subscribed = myMemberId ? subscribers.some((m) => m.memberId === myMemberId) : false;
  const checkedIds = new Set(subscribers.map((m) => m.memberId));

  const toggle = (memberId: string) => {
    const next = checkedIds.has(memberId)
      ? subscribers.filter((m) => m.memberId !== memberId).map((m) => m.memberId)
      : [...subscribers.map((m) => m.memberId), memberId];
    setMutation.mutate(next);
  };

  const all = (allMembers?.items ?? []) as Member[];
  const keyword = search.trim().toLowerCase();
  const match = (m: Member) =>
    !keyword || m.displayName.toLowerCase().includes(keyword) || (m.handle ?? '').toLowerCase().includes(keyword);
  const humans = all.filter((m) => m.type !== 'ai_agent' && match(m));
  const agents = all.filter((m) => m.type === 'ai_agent' && match(m));

  const renderRow = (m: Member) => {
    const checked = checkedIds.has(m.id);
    return (
      <button
        key={m.id}
        type="button"
        onClick={() => toggle(m.id)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-foreground"
        data-ai-component="ui.subscribe-row"
        data-checked={checked}
      >
        <Checkbox checked={checked} aria-hidden="true" className="pointer-events-none size-3.5" />
        <Avatar size="sm" className="size-5 shrink-0">
          {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt={m.displayName} /> : null}
          <AvatarFallback className="text-10">{m.displayName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1 truncate">{m.displayName}</span>
      </button>
    );
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(''); }}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={t(subscribed ? 'subscribe.subscribed' : 'subscribe.title')}
            title={t(subscribed ? 'subscribe.subscribed' : 'subscribe.title')}
            data-ai-component="ui.subscribe-button"
            data-subscribed={subscribed}
            className={cn(
              'flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors [transition-duration:var(--motion-fast)] outline-hidden hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45',
              className,
            )}
          />
        }
      >
        {subscribers.length > 0 ? (
          <span className="flex items-center">
            {subscribers.slice(0, 3).map((m, i) => (
              <Avatar
                key={m.memberId}
                size="sm"
                className={cn(
                  'size-4.5 rounded-full ring-1 ring-background',
                  i > 0 && '-ml-1.5',
                  subscribed && 'ring-accent-purple/60',
                )}
              >
                {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt={m.displayName} /> : null}
                <AvatarFallback className="text-10">{m.displayName[0]?.toUpperCase() ?? '?'}</AvatarFallback>
              </Avatar>
            ))}
            {subscribers.length > 3 ? (
              <span className="-ml-1.5 rounded-full bg-muted px-1 text-10 leading-4 ring-1 ring-background">
                +{subscribers.length - 3}
              </span>
            ) : null}
          </span>
        ) : (
          <UserRoundPlus className="size-3.5" strokeWidth={1.75} />
        )}
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={6} className="w-60 p-2">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('subscribe.searchPlaceholder')}
            className="h-8 pl-7 text-xs"
          />
        </div>
        {humans.length > 0 ? (
          <div className="mb-1">
            <p className="px-2 py-1 text-10 font-semibold uppercase tracking-wider text-muted-foreground">
              {t('subscribe.members')}
            </p>
            {humans.map(renderRow)}
          </div>
        ) : null}
        {agents.length > 0 ? (
          <div>
            <p className="px-2 py-1 text-10 font-semibold uppercase tracking-wider text-muted-foreground">
              {t('subscribe.agents')}
            </p>
            {agents.map(renderRow)}
          </div>
        ) : null}
        {humans.length === 0 && agents.length === 0 ? (
          <p className="px-2 py-3 text-center text-xs text-muted-foreground">
            {t('subscribe.empty')}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
