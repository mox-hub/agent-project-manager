import { cn } from '@/lib/utils';
import { MemberAvatar } from './member-avatar';
import { Bot, X } from 'lucide-react';
import type { Member } from '../types';

export interface MemberChipProps {
  member: Pick<Member, 'id' | 'type' | 'displayName' | 'handle' | 'avatarUrl' | 'isOnline'>;
  size?: 'xs' | 'sm' | 'md';
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
  role?: string;
  onClick?: () => void;
}

const CONTAINER_SIZES = {
  xs: 'h-5 px-1.5 text-[10px] gap-1',
  sm: 'h-6 px-2 text-[11px] gap-1.5',
  md: 'h-7 px-2.5 text-xs gap-1.5',
};

export function MemberChip({
  member,
  size = 'sm',
  removable = false,
  onRemove,
  className,
  role,
  onClick,
}: MemberChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-muted text-foreground border border-border/50 transition-colors',
        CONTAINER_SIZES[size],
        onClick && 'cursor-pointer hover:bg-muted/70',
        className,
      )}
      onClick={onClick}
    >
      <MemberAvatar member={member} size={size === 'md' ? 'sm' : 'xs'} showBadge={false} />
      <span className="font-medium truncate max-w-[120px]">{member.displayName}</span>
      {role && size !== 'xs' && (
        <span className="text-muted-foreground truncate">· {role}</span>
      )}
      {member.type === 'ai_agent' && (
        <Bot className="h-2.5 w-2.5 text-violet-500 shrink-0" />
      )}
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-0.5 -mr-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </span>
  );
}
