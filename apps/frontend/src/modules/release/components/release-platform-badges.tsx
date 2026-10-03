/**
 * 发版平台徽标组 + 版本通道徽标（CAP-K-03 批三）。
 * 列表行尾/详情 meta/即将发版区共用：平台用 lucide 图标 muted 直排（title 提示平台名），
 * 超 4 个收敛为「前 3 + +N」；通道由 semver 后缀推导，stable 不渲染。
 */
import {
  Apple,
  AppWindow,
  Globe,
  Smartphone,
  Terminal,
  type LucideIcon,
} from 'lucide-react';
import {
  RELEASE_PLATFORMS,
  RELEASE_PLATFORM_LABELS,
  type ReleaseChannel,
  type ReleasePlatform,
} from '../api/release-api';
import { cn } from '@/lib/utils';

/** 平台 → 图标（专有名词不 i18n；linux 借 Terminal、web 借 Globe 的通用隐喻） */
const PLATFORM_ICONS: Record<ReleasePlatform, LucideIcon> = {
  android: Smartphone,
  ios: Smartphone,
  windows: AppWindow,
  macos: Apple,
  linux: Terminal,
  web: Globe,
};

export function ReleasePlatformBadges({
  platforms,
  className,
  iconClassName,
}: {
  platforms?: string[] | null;
  className?: string;
  iconClassName?: string;
}) {
  const known = (platforms ?? []).filter((p): p is ReleasePlatform =>
    (RELEASE_PLATFORMS as readonly string[]).includes(p),
  );
  if (known.length === 0) return null;
  const shown = known.length > 4 ? known.slice(0, 3) : known;
  const overflow = known.length - shown.length;
  return (
    <span
      className={cn('inline-flex items-center gap-1', className)}
      title={releasePlatformTitle(platforms)}
    >
      {shown.map((p) => {
        const Icon = PLATFORM_ICONS[p];
        return (
          <Icon
            key={p}
            className={cn('size-3 shrink-0 text-content-text-muted', iconClassName)}
          />
        );
      })}
      {overflow > 0 ? (
        <span className="text-2xs text-content-text-muted">+{overflow}</span>
      ) : null}
    </span>
  );
}

export function releasePlatformTitle(platforms?: string[] | null): string {
  const known = (platforms ?? []).filter((p): p is ReleasePlatform =>
    (RELEASE_PLATFORMS as readonly string[]).includes(p),
  );
  return known.map((p) => RELEASE_PLATFORM_LABELS[p]).join(' / ');
}

const CHANNEL_CHIP_TONE: Record<Exclude<ReleaseChannel, 'stable'>, string> = {
  alpha: 'bg-accent-purple-light text-accent-purple',
  beta: 'bg-accent-blue-light text-accent-blue',
  rc: 'bg-accent-yellow-light text-accent-yellow',
};

export function ReleaseChannelChip({ channel }: { channel: ReleaseChannel }) {
  if (channel === 'stable') return null;
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-px text-2xs font-medium uppercase',
        CHANNEL_CHIP_TONE[channel],
      )}
    >
      {channel}
    </span>
  );
}
