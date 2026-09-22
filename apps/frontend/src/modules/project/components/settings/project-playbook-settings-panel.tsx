import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Circle,
  CircleDot,
  ExternalLink,
  FileText,
  Route,
  SkipForward,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonList } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  usePlaybookStatus,
} from '../../hooks/use-playbook';
import type { PlaybookStageStatus } from '../../api/playbook-api';

/**
 * 项目设置 · 剧本分页面板（CAP-P-01 五期 IA 降级）：
 * 只读五阶段进度 + 闸门状态；访谈/跳过/组合件等操作保留在
 * /projects/:id/playbook 完整页，入口按钮跳转。
 */
const STAGE_ICONS = {
  done: CheckCircle2,
  active: CircleDot,
  skipped: SkipForward,
  pending: Circle,
} as const;

const STAGE_ICON_CLASS: Record<PlaybookStageStatus['status'], string> = {
  done: 'text-accent-green',
  active: 'text-accent-blue',
  skipped: 'text-muted-foreground',
  pending: 'text-muted-foreground/60',
};

export function ProjectPlaybookSettingsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: status, isLoading } = usePlaybookStatus(projectId);
  const mounted = !!status?.template;
  const stages = status?.stages ?? [];
  const pendingGate = stages.find((s) => s.gateStatus === 'pending');

  return (
    <div className="space-y-5">
      <SectionCard
        title={
          mounted
            ? status?.template?.name ?? t('projectSettings.playbook.title')
            : t('projectSettings.playbook.unmountedTitle')
        }
        description={
          mounted
            ? t('projectSettings.playbook.mountedDesc')
            : t('projectSettings.playbook.unmountedDesc')
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => navigate(`/app/projects/${projectId}/playbook`)}
          >
            <ExternalLink size={14} />
            {t('projectSettings.playbook.openFull')}
          </Button>
        }
      >
        {isLoading ? (
          <SkeletonList count={3} />
        ) : !mounted ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Route size={16} className="shrink-0" />
            {t('projectSettings.playbook.empty')}
          </div>
        ) : (
          <div className="space-y-0">
            {stages.map((stage, index) => {
              const Icon = STAGE_ICONS[stage.status];
              return (
                <div key={stage.key} className="relative flex items-start gap-3 py-2.5">
                  {index < stages.length - 1 && (
                    <span className="absolute left-[7px] top-8 h-[calc(100%-1rem)] w-px bg-border" />
                  )}
                  <Icon
                    size={16}
                    className={cn('mt-0.5 shrink-0', STAGE_ICON_CLASS[stage.status])}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{stage.name}</span>
                      <span className="text-10 uppercase tracking-wide text-muted-foreground">
                        {t(`projectSettings.playbook.stageStatus.${stage.status}`)}
                      </span>
                      {stage.gateStatus === 'pending' && (
                        <span className="rounded-full bg-accent-purple-light px-2 py-0.5 text-10 font-medium text-accent-purple">
                          {t('projectSettings.playbook.gatePending')}
                        </span>
                      )}
                    </div>
                    {stage.documentTitle && (
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <FileText size={12} className="shrink-0" />
                        <span className="truncate">{stage.documentTitle}</span>
                      </div>
                    )}
                    {stage.status === 'skipped' && stage.skippedReason && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {t('projectSettings.playbook.skipReason')}: {stage.skippedReason}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {pendingGate && (
              <div className="mt-2 rounded-lg border border-accent-purple/30 bg-accent-purple-light/40 px-3 py-2 text-xs text-accent-purple">
                {t('projectSettings.playbook.gateHint')}
              </div>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
