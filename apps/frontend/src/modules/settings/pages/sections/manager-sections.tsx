import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { FolderOpen } from 'lucide-react';
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
  return <TagManager />;
}

export function StatusesSettingsSection() {
  return <StatusManager />;
}

export function RolesSettingsSection() {
  return <RoleManager />;
}

export function TemplatesSettingsSection() {
  return <TemplateManager />;
}

export function StorageSettingsSection() {
  const { t } = useTranslation();
  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={FolderOpen} iconColor="text-accent-yellow" title={t('settings.storageSection')} />
      <div className="p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <StorageSettings />
        </div>
      </div>
    </PageShell>
  );
}
