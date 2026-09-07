import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FolderGit2, ScanSearch } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SkeletonList } from '@/components/ui/skeleton';
import { AsyncState } from '@/components/ui/async-state';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { isTerminalRunStatus, useExecutionRunDetail } from '@/modules/executions/api/execution-api';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';
import { ProjectEntryWizard } from '../components/import/project-entry-wizard';
import { ProfileCompletenessRing } from '../components/profile/profile-completeness-ring';
import { ProfileSlotSection } from '../components/profile/profile-slot-section';
import {
  useApproveProfileAtom,
  useCreateProfileAtom,
  useEditProfileAtom,
  useIngestArchaeology,
  useProfile,
  useRejectProfileAtom,
  useStartArchaeology,
} from '../hooks/use-profile';

/**
 * 项目档案页（v2 纪要切片 1）：槽位分组 + 完备度环 + AI 草稿审批区。
 * 考古流程：触发 → 轮询执行详情 → 终态自动 ingest 落草稿 → 草稿区人工批准。
 */
export function ProjectProfilePage() {
  const { t } = useTranslation();
  const { projectId = '' } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: profile, isLoading, isError } = useProfile(projectId);

  // ?wizard=1：创建流程选「导入已有项目」后带参跳入，自动打开接入向导
  const [wizardOpen, setWizardOpen] = useState(searchParams.get('wizard') === '1');
  useEffect(() => {
    if (searchParams.get('wizard') === '1') {
      setWizardOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const [archaeologyExecutionId, setArchaeologyExecutionId] = useState<string | null>(null);
  const [ingested, setIngested] = useState(false);
  const { data: runDetail } = useExecutionRunDetail(archaeologyExecutionId, {
    // 未到终态时 4s 轮询跟随（考古执行在后台推进，页面须主动拉取）
    refetchInterval: (query) =>
      isTerminalRunStatus(query.state.data?.status) ? false : 4000,
  });
  const startArchaeology = useStartArchaeology(projectId);
  const ingest = useIngestArchaeology(projectId);

  const createAtom = useCreateProfileAtom(projectId);
  const editAtom = useEditProfileAtom(projectId);
  const approveAtom = useApproveProfileAtom(projectId);
  const rejectAtom = useRejectProfileAtom(projectId);

  const [addSlot, setAddSlot] = useState<string | null>(null);
  const [addContent, setAddContent] = useState('');

  // 考古执行到终态：completed 自动入库；失败/阻塞停在原地由人查看执行日志
  const runCompleted = runDetail?.status === 'completed';
  useEffect(() => {
    if (!archaeologyExecutionId || ingested || !runCompleted) return;
    setIngested(true);
    ingest.mutate(archaeologyExecutionId);
  }, [archaeologyExecutionId, runCompleted, ingested, ingest]);

  const busy =
    createAtom.isPending ||
    editAtom.isPending ||
    approveAtom.isPending ||
    rejectAtom.isPending;

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectProfile}
      projectId={projectId}
      title={t('project.profilePage.title')}
      hideBreadcrumb
      description={t('project.profilePage.description')}
      actions={
        <div className="flex items-center gap-2">
          {profile && (
            <div
              className="mr-1 flex items-center gap-2"
              title={t('project.profilePage.completeness')}
            >
              <ProfileCompletenessRing
                filled={profile.completeness.filled}
                total={profile.completeness.total}
                size={40}
              />
            </div>
          )}
          <HeaderActionButton
            icon={FolderGit2}
            label={t('project.profilePage.importExisting')}
            onClick={() => setWizardOpen(true)}
            data-ai-component="project.project-profile.import"
            data-ai-action="project.project-profile.import.click"
            data-ai-role="jump"
          />
          <HeaderActionButton
            icon={ScanSearch}
            label={
              startArchaeology.isPending
                ? t('project.profilePage.archaeologyStarting')
                : t('project.profilePage.runArchaeology')
            }
            disabled={startArchaeology.isPending}
            onClick={() =>
              startArchaeology.mutate(undefined, {
                onSuccess: (res) => {
                  setIngested(false);
                  setArchaeologyExecutionId(res.executionId);
                },
              })
            }
            data-ai-component="project.project-profile.archaeology"
            data-ai-action="project.project-profile.archaeology.click"
            data-ai-role="submit"
          />
        </div>
      }
    >
      {startArchaeology.isPending && (
        <p className="mb-3 rounded-lg bg-accent-blue-light/50 px-3 py-2 text-xs text-accent-blue">
          {t('project.profilePage.archaeologyStarting')}
        </p>
      )}
      {archaeologyExecutionId && runDetail && !isTerminalRunStatus(runDetail.status) && (
        <p className="mb-3 rounded-lg bg-accent-blue-light/50 px-3 py-2 text-xs text-accent-blue">
          {t('project.profilePage.archaeologyRunning', {
            status: runDetail.status,
            steps: runDetail.steps?.length ?? 0,
          })}
        </p>
      )}
      {ingest.isPending && (
        <p className="mb-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {t('project.profilePage.ingesting')}
        </p>
      )}
      {ingest.isError && (
        <p className="mb-3 rounded-lg bg-accent-red-light/50 px-3 py-2 text-xs text-accent-red">
          {t('project.profilePage.ingestFailed', {
            reason: ingest.error instanceof Error ? ingest.error.message : '',
          })}
        </p>
      )}
      {ingested && !ingest.isPending && (
        <p className="mb-3 rounded-lg bg-accent-green-light/50 px-3 py-2 text-xs text-accent-green">
          {t('project.profilePage.ingestDone', { created: ingest.data?.created ?? 0, skipped: ingest.data?.skipped ?? 0 })}
        </p>
      )}
      {startArchaeology.isError && (
        <p className="mb-3 rounded-lg bg-accent-red-light/50 px-3 py-2 text-xs text-accent-red">
          {t('project.profilePage.archaeologyFailed')}
        </p>
      )}

      {isLoading ? (
        <SkeletonList count={5} />
      ) : isError || !profile ? (
        <AsyncState isEmpty>
          <div className="rounded-xl border bg-card p-6 text-sm">
            <p className="font-medium">{t('project.profilePage.loadFailed')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('project.profilePage.loadFailedDesc')}
            </p>
          </div>
        </AsyncState>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {profile.slots.map((group) => (
            <ProfileSlotSection
              key={group.slot}
              group={group}
              projectId={projectId}
              busy={busy}
              onEdit={(atomId, content) => editAtom.mutate({ atomId, content })}
              onApprove={(atomId) => approveAtom.mutate(atomId)}
              onReject={(atomId) => rejectAtom.mutate({ atomId })}
              onAdd={(slot) => {
                setAddSlot(slot);
                setAddContent('');
              }}
            />
          ))}
        </div>
      )}

      <ProjectEntryWizard
        projectId={projectId}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />

      <Dialog open={!!addSlot} onOpenChange={(open) => !open && setAddSlot(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('project.profilePage.addTo', {
                slot: profile?.slots.find((s) => s.slot === addSlot)?.label ?? addSlot ?? '',
              })}
            </DialogTitle>
          </DialogHeader>
          <Input
            value={addContent}
            onChange={(e) => setAddContent(e.target.value)}
            placeholder={t('project.profilePage.addPlaceholder')}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && addContent.trim()) {
                createAtom.mutate(
                  {
                    projectId,
                    slot: addSlot as never,
                    content: addContent.trim(),
                  },
                  { onSuccess: () => setAddSlot(null) },
                );
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSlot(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!addContent.trim() || createAtom.isPending}
              onClick={() =>
                addSlot &&
                createAtom.mutate(
                  { projectId, slot: addSlot as never, content: addContent.trim() },
                  { onSuccess: () => setAddSlot(null) },
                )
              }
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProjectDetailFrame>
  );
}
