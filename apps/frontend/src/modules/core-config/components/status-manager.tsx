import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import { PageShell } from '@/components/semantic/page-shell';
import { nodeToText } from '@/components/semantic/page-header';
import { SettingsHeader } from '@/components/semantic/settings-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusFamilyPanel, type StatusFamily } from './status-family-panel';

/**
 * 设置·状态（CAP-P-02 增强 2026-10-01 真实化重做）：
 * 任务/项目两族切换 + StatusFamilyPanel 装配（分组列表/真实视觉/拖拽/流转配置）。
 * 新建入口在各分组头「+」（贴齐 Linear 形态，可指定目标分组）。
 */
export function StatusManager() {
  const { t } = useTranslation();
  const [family, setFamily] = useState<StatusFamily>('task');

  return (
    <PageShell
      variant="standard"
      contentClassName="gap-4"
      aiPage="settings.statuses"
      className="bg-background text-foreground"
    >
      {/* 设置页头（语义组件批 2026-10-01）：大标题双态吸顶，替代 PageShell 内嵌 PageHeader */}
      <SettingsHeader
        icon={Layers}
        tone="yellow"
        title={t('settings.statuses')}
        description={t('settings.statusesDesc')}
        actions={<FavoriteToggle label={nodeToText(t('settings.statuses')).trim()} />}
      />
      <div className="flex justify-center">
        <SegmentedControl
          variant="rect"
          value={family}
          onChange={(value) => setFamily(value as StatusFamily)}
          options={[
            { value: 'task', label: t('settings.typeTask'), tone: 'green' },
            { value: 'project', label: t('settings.typeProject'), tone: 'blue' },
          ]}
        />
      </div>

      <StatusFamilyPanel family={family} withCounts withViewTasks />
    </PageShell>
  );
}
