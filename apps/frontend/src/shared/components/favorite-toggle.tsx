/**
 * FavoriteToggle - 可复用收藏星标
 *
 * 与 PageHeader 内置星标同形态（Star + accent-yellow + 收藏填充）。
 * 用于无 PageHeader 的次级页面（SubPageToolbar actions、项目详情上下文栏等）
 * 补齐收藏入口；收藏数据走 useAppStore.favoritePages（zustand persist）。
 */

import { useLocation } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/infrastructure/store/app-store';

interface FavoriteToggleProps {
  /** 收藏标识，默认取当前路由 path */
  favoriteId?: string;
  /** 收藏时存入侧栏的页面名称（为空时回退存 path） */
  label: string;
  className?: string;
  /** 透传 data-ai-* 属性用的组件 id（PageHeader 委托渲染时使用） */
  aiId?: string;
}

export function FavoriteToggle({ favoriteId, label, className, aiId }: FavoriteToggleProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const favoriteKey = favoriteId ?? location.pathname;
  const isFavorite = useAppStore((s) => s.favoritePages.some((f) => f.path === favoriteKey));
  const toggleFavoritePage = useAppStore((s) => s.toggleFavoritePage);

  const actionText = isFavorite ? t('common.unfavorite') : t('common.favorite');

  return (
    <button
      type="button"
      onClick={() => toggleFavoritePage({ path: favoriteKey, label: label || favoriteKey })}
      aria-pressed={isFavorite}
      aria-label={actionText}
      title={actionText}
      data-ai-component={aiId ? `${aiId}.favorite-button` : 'ui.favorite-toggle'}
      data-ai-action={aiId ? `${aiId}.favorite-button.click` : 'ui.favorite-toggle.click'}
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors [transition-duration:var(--motion-fast)] outline-hidden hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/45',
        isFavorite && 'text-accent-yellow hover:bg-accent-yellow/15 hover:text-accent-yellow',
        className,
      )}
    >
      <Star className="size-3.5" strokeWidth={1.75} fill={isFavorite ? 'currentColor' : 'none'} />
    </button>
  );
}
