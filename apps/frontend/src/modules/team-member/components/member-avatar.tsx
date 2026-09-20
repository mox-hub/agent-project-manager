import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import Avvvatars from 'avvvatars-react';
import NiceAvatar, { genConfig } from 'react-nice-avatar';
import type { Member } from '../types';

export interface MemberAvatarProps {
  member?: (Pick<Member, 'type' | 'displayName'> & { handle?: string; avatarUrl?: string | null; isOnline?: boolean }) | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  fallbackInitials?: string;
  useAvvvatars?: boolean;
  avvvatarsStyle?: 'shape' | 'character';
  useNiceAvatar?: boolean;
  useInitials?: boolean;
  name?: string;
  avatarUrl?: string | null;
}

const NUMERIC_SIZES = {
  xs: 20,
  sm: 24,
  md: 32,
  lg: 40,
  xl: 56,
};

const SIZE_CLASSES = {
  xs: 'h-5 w-5 text-10',
  sm: 'h-6 w-6 text-10',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-base',
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
  useAvvvatars,
  avvvatarsStyle = 'shape',
  useNiceAvatar,
  useInitials,
  name,
  avatarUrl,
}: MemberAvatarProps) {
  const resolvedDisplayName = member?.displayName || name || '';
  const resolvedHandle = member?.handle || '';
  const resolvedAvatarUrl = avatarUrl !== undefined ? avatarUrl : member?.avatarUrl;
  const hasMemberInfo = Boolean(member || name || fallbackInitials);
  const isAI = member?.type === 'ai_agent' || resolvedAvatarUrl?.startsWith('avvvatars:');
  const isNiceAvatarUri = Boolean(resolvedAvatarUrl?.startsWith('nice-avatar:'));
  const isAvvvatarsUri = Boolean(resolvedAvatarUrl?.startsWith('avvvatars:'));
  const hasCustomImg = Boolean(
    resolvedAvatarUrl && !isAvvvatarsUri && !isNiceAvatarUri,
  );

  const seed = resolvedDisplayName || resolvedHandle || fallbackInitials || (isAI ? 'agent' : 'user');
  const initials = fallbackInitials || (resolvedDisplayName || resolvedHandle ? getInitials(resolvedDisplayName || resolvedHandle) : '?');
  const hue = getHue(seed);

  // 双表面规则：人类优先 NiceAvatar，AI 优先 Avvvatars
  const shouldRenderAvvvatars = hasMemberInfo && (isAI || useAvvvatars || isAvvvatarsUri);
  const shouldRenderNiceAvatar =
    hasMemberInfo && !isAI && !hasCustomImg && !useInitials && (useNiceAvatar !== false || isNiceAvatarUri);

  const avvvatarsStyleResolved =
    resolvedAvatarUrl === 'avvvatars:character' || avvvatarsStyle === 'character'
      ? 'character'
      : 'shape';

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0 overflow-hidden border border-border/50',
        SIZE_CLASSES[size],
        !hasCustomImg && !shouldRenderAvvvatars && !shouldRenderNiceAvatar && 'ring-1 ring-inset ring-border/40',
        className,
      )}
      style={
        hasCustomImg || shouldRenderAvvvatars || shouldRenderNiceAvatar
          ? undefined
          : {
              background: `linear-gradient(135deg, hsl(${hue} 65% 55%), hsl(${(hue + 40) % 360} 65% 45%))`,
            }
      }
      // 只传「类型 + 显示名 + 头像」的调用方没有 handle，不能拼出「(@undefined)」
      title={
        member
          ? member.handle
            ? `${member.displayName} (@${member.handle})`
            : member.displayName
          : resolvedDisplayName || ''
      }
    >
      {hasCustomImg ? (
        <img
          src={resolvedAvatarUrl!}
          alt={resolvedDisplayName}
          className="h-full w-full object-cover"
        />
      ) : shouldRenderAvvvatars ? (
        <div className="size-full flex items-center justify-center overflow-hidden">
          <Avvvatars
            value={seed}
            size={NUMERIC_SIZES[size]}
            style={avvvatarsStyleResolved}
            shadow={false}
          />
        </div>
      ) : shouldRenderNiceAvatar ? (
        <div className="size-full flex items-center justify-center overflow-hidden">
          <NiceAvatar
            style={{ width: '100%', height: '100%' }}
            shape="circle"
            {...genConfig(seed)}
          />
        </div>
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
