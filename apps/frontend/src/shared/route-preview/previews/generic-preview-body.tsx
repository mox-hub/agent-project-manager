import { useTranslation } from '@/hooks/useTranslation';
import { PreviewFooterMeta } from './preview-fields';

/** 静态路由 → 描述文案 i18n key */
const STATIC_DESCRIPTIONS: Record<string, string> = {
  '/app': 'routePreview.desc.projects',
  '/app/projects': 'routePreview.desc.projects',
  '/app/projects/dashboard': 'routePreview.desc.dashboard',
  '/app/issues': 'routePreview.desc.tasks',
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
    <div className="space-y-2">
      <p className="text-11 text-muted-foreground leading-relaxed">
        {descKey ? t(descKey) : t('routePreview.generic.hint')}
      </p>
      <PreviewFooterMeta>
        <span className="truncate font-mono text-10 text-muted-foreground/70">{path}</span>
      </PreviewFooterMeta>
    </div>
  );
}
