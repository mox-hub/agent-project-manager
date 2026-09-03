/**
 * 通用预览卡片 body - 静态页面 / 未注册路由的兜底展示
 * 说明文案来自 STATIC_DESCRIPTIONS（i18n key），未命中时显示通用提示 + 完整路径
 */

import { useTranslation } from '@/hooks/useTranslation';

/** 静态路由 → 描述文案 i18n key */
const STATIC_DESCRIPTIONS: Record<string, string> = {
  '/app': 'routePreview.desc.projects',
  '/app/projects': 'routePreview.desc.projects',
  '/app/projects/dashboard': 'routePreview.desc.dashboard',
  '/app/tasks': 'routePreview.desc.tasks',
  '/app/bugs': 'routePreview.desc.bugs',
  '/app/documents': 'routePreview.desc.documents',
  '/app/analytics': 'routePreview.desc.analytics',
  '/app/notifications': 'routePreview.desc.notifications',
  '/app/acceptance': 'routePreview.desc.acceptance',
  '/app/repositories': 'routePreview.desc.repositories',
  '/app/members': 'routePreview.desc.members',
  '/app/teams': 'routePreview.desc.teams',
  '/app/search': 'routePreview.desc.search',
  '/app/help': 'routePreview.desc.help',
  '/app/settings': 'routePreview.desc.settings',
};

export function GenericPreviewBody({ path }: { path: string }) {
  const { t } = useTranslation();
  const descKey = STATIC_DESCRIPTIONS[path];
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-11 text-muted-foreground">
        {descKey ? t(descKey) : t('routePreview.generic.hint')}
      </p>
      <p className="truncate font-mono text-10 text-muted-foreground/70">{path}</p>
    </div>
  );
}
