import { useMemo } from 'react';

import { cn } from '@/lib/utils';
import { useMembers } from '../hooks';
import { MemberCardPopover } from './member-card-popover';

const MENTION_TOKEN_RE = /(@[a-zA-Z0-9_\-.]+)/g;

/**
 * 渲染含 @handle 的文本：命中的成员渲染为可悬浮成员卡片的提及芯片，
 * 未命中的 token 保持原样。成员列表来自 useMembers 缓存（limit 200）。
 */
export function MentionRenderer({
  text,
  className,
}: {
  text?: string | null;
  className?: string;
}) {
  const { data } = useMembers({ limit: 200 });
  const byHandle = useMemo(() => {
    const map = new Map<string, { id: string; handle: string }>();
    for (const m of data?.items ?? []) {
      if (m.handle) map.set(m.handle.toLowerCase(), { id: m.id, handle: m.handle });
    }
    return map;
  }, [data]);

  if (!text) return null;

  const parts = text.split(MENTION_TOKEN_RE);

  return (
    <span className={cn('whitespace-pre-wrap', className)}>
      {parts.map((part, i) => {
        if (part.startsWith('@')) {
          const hit = byHandle.get(part.slice(1).toLowerCase());
          if (hit) {
            return (
              <MemberCardPopover
                key={`${hit.id}-${i}`}
                memberId={hit.id}
                side="top"
                trigger={
                  <span className="cursor-pointer rounded bg-accent-blue/10 px-1 py-0.5 text-xs font-medium text-accent-blue hover:bg-accent-blue/20">
                    @{hit.handle}
                  </span>
                }
              />
            );
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
