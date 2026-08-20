import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Tags, FolderOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TagManager } from '@/modules/core-config/components/tag-manager';
import { StatusManager } from '@/modules/core-config/components/status-manager';
import { RoleManager } from '@/modules/core-config/components/role-manager';
import { TemplateManager } from '@/modules/core-config/components/template-manager';
import { StorageSettings } from '@/modules/settings/components/storage-settings';

/**
 * 工作区配置类子页：复用 core-config 的 Manager 组件，
 * 外壳统一为 PageHeader + 卡片内容。
 */

export function LabelsSettingsSection() {
  const { t } = useTranslation();
  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={Tags} title={t('settings.labels')} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <TagManager />
        </div>
      </div>
    </PageShell>
  );
}

export function StatusesSettingsSection() {
  const { t } = useTranslation();
  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={Tags} title={t('settings.statuses')} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <StatusManager />
        </div>
      </div>
    </PageShell>
  );
}

export function RolesSettingsSection() {
  const { t } = useTranslation();
  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={Tags} title={t('settings.roles')} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <RoleManager />
        </div>
      </div>
    </PageShell>
  );
}

export function TemplatesSettingsSection() {
  const { t } = useTranslation();
  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={Tags} title={t('settings.templates')} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <TemplateManager />
        </div>
      </div>
    </PageShell>
  );
}

export function StorageSettingsSection() {
  const { t } = useTranslation();
  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={FolderOpen} title={t('settings.storageSection')} />
      <div className="p-6">
        <div className="mx-auto max-w-3xl">
          <StorageSettings />
        </div>
      </div>
    </PageShell>
  );
}
