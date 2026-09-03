import { cn } from '@/lib/utils';
import { Bot, User as UserIcon } from 'lucide-react';
import type { Member } from '../types';

export interface MemberAvatarProps {
  member?: Pick<Member, 'type' | 'displayName' | 'handle' | 'avatarUrl' | 'isOnline'> | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  fallbackInitials?: string;
}

const SIZE_CLASSES = {
  xs: 'h-5 w-5 text-10',
  sm: 'h-6 w-6 text-10',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-base',
};

const ICON_SIZES = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-7 w-7',
};

const BADGE_SIZES = {
  xs: 'h-2 w-2',
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-4 w-4',
};

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getHue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

export function MemberAvatar({
  member,
  size = 'md',
  className,
  showBadge = true,
  fallbackInitials,
}: MemberAvatarProps) {
  const initials = fallbackInitials || (member ? getInitials(member.displayName || member.handle || '') : '?');
  const hue = member ? getHue(member.displayName || member.handle || '') : 200;
  const isAI = member?.type === 'ai_agent';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 overflow-hidden border border-border/50',
        SIZE_CLASSES[size],
        !member?.avatarUrl && 'ring-1 ring-inset ring-border/40',
        className,
      )}
      style={
        member?.avatarUrl
          ? undefined
          : {
              background: `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 40) % 360} 65% 45%))`,
            }
      }
      title={member ? `${member.displayName} (@${member.handle})` : ''}
    >
      {member?.avatarUrl ? (
        <img
          src={member.avatarUrl}
          alt={member.displayName}
          className="h-full w-full object-cover"
        />
      ) : isAI ? (
        <Bot className={cn('text-white/90', ICON_SIZES[size])} />
      ) : (
        <span className="leading-none tracking-tight">{initials}</span>
      )}

      {showBadge && isAI && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full bg-background flex items-center justify-center border border-border',
            BADGE_SIZES[size],
          )}
        >
          <Bot className="h-full w-full text-accent-purple" />
        </span>
      )}

      {showBadge && !isAI && member?.isOnline && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 rounded-full bg-accent-green border-2 border-background',
            BADGE_SIZES[size],
          )}
        />
      )}
    </div>
  );
}
