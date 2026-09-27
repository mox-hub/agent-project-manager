/**
 * 项目设置 · 提示词分页面板（CAP-A-24 + 增强 A/B/C/D）：
 * 项目级提示词编辑——注入到该项目全部派发 prompt 的「Project Instructions」段；
 * 空文本=未配置（不注入）。保存走 PUT /prompts/config，空串即清空。
 * - AGENTS.md 同步态（增强 D）：保存后物化到工作区 AGENTS.md 受管区块，
 *   未绑定工作区/IO 失败诚实降级提示；文件侧被外部修改（drifted）时提供
 *   「以文件为准」回填（人确认，不静默覆盖任一侧）。
 * - AI 起草（增强 B）：静默场景 prompt-draft-project，草稿只进编辑框。
 * - 就地预览（增强 C）：选任一项目任务干跑 prompt-preview，「所见即所派」
 *   反向带到编辑时。
 * 服务端值到位后才挂编辑器（初始态一次性注入），避免 effect 同步 setState。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Eye, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { PromptEditor } from '@/shared/components/prompt-editor';
import { useProjectTasks } from '@/modules/issue/hooks/use-project-tasks';
import {
  usePromptConfig,
  usePromptPreview,
  useUpdatePromptConfig,
  type PromptPreviewSection,
} from '@/modules/prompt/api/prompt-api';
import { useSilentPromptDraft } from '@/modules/assistant/hooks/use-silent-ai';

const SECTION_LABEL_KEYS: Record<string, string> = {
  system: 'prompt.sections.system',
  executor: 'prompt.sections.executor',
  team: 'prompt.sections.team',
  project: 'prompt.sections.project',
  task: 'prompt.sections.task',
  skills: 'prompt.sections.skills',
  taskBody: 'prompt.sections.taskBody',
  context: 'prompt.sections.context',
  closing: 'prompt.sections.closing',
};

export function ProjectPromptSettingsPanel({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const config = usePromptConfig(projectId);

  if (config.isLoading || !config.data) {
    return (
      <SectionCard title={t('projectSettings.prompt.title')} description={t('projectSettings.prompt.desc')}>
        <Skeleton className="h-40 w-full" />
      </SectionCard>
    );
  }

  return (
    <ProjectPromptEditorPanel
      key={projectId}
      projectId={projectId}
      initial={config.data.projectPrompt ?? ''}
      fileContent={config.data.agentsFile?.blockContent ?? null}
    />
  );
}

function ProjectPromptEditorPanel({
  projectId,
  initial,
  fileContent,
}: {
  projectId: string;
  initial: string;
  /** AGENTS.md 文件侧受管区块内容（drift 回填来源；null = 文件/区块缺失） */
  fileContent: string | null;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  const [previewIssueId, setPreviewIssueId] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const update = useUpdatePromptConfig();
  const draft = useSilentPromptDraft();
  const dirty = text !== initial;
  const driftDetected = fileContent !== null && fileContent.trim() !== text.trim();

  const handleSave = async () => {
    try {
      const result = await update.mutateAsync({ projectId, projectPrompt: text });
      const sync = result.agentsSync;
      if (sync?.synced) {
        toast.success(t('projectSettings.prompt.agentsSynced'));
      } else if (sync && !sync.synced && sync.reason) {
        toast.info(t('projectSettings.prompt.agentsUnsynced', { reason: sync.reason }));
      } else {
        toast.success(t('projectSettings.prompt.saved'));
      }
    } catch {
      // 失败提示由 mutation onError 统一弹出
    }
  };

  // 以文件为准回填：把 AGENTS.md 侧内容写回 AppConfig 并重新物化归一
  const adoptFileSide = async () => {
    try {
      await update.mutateAsync({ projectId, projectPrompt: fileContent ?? '' });
      toast.success(t('projectSettings.prompt.adopted'));
    } catch {
      // 失败提示由 mutation onError 统一弹出
    }
  };

  return (
    <SectionCard
      title={t('projectSettings.prompt.title')}
      description={t('projectSettings.prompt.desc')}
    >
      <div className="space-y-3">
        {driftDetected ? (
          <div
            className="flex items-start justify-between gap-3 rounded-lg border border-accent-yellow/40 bg-accent-yellow/10 px-3 py-2"
            data-ai-component="projectSettings.prompt.drift"
          >
            <p className="flex items-start gap-2 text-xs text-accent-yellow">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {t('projectSettings.prompt.drifted')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 shrink-0 text-xs"
              disabled={update.isPending}
              onClick={() => void adoptFileSide()}
              data-ai-action="projectSettings.prompt.adoptFile"
            >
              {t('projectSettings.prompt.adoptFile')}
            </Button>
          </div>
        ) : null}

        <PromptEditor
          value={text}
          onChange={setText}
          placeholder={t('projectSettings.prompt.placeholder')}
          rows={6}
          maxHeight={360}
          onDraft={async () => {
            const result = await draft.mutateAsync({
              scenario: 'prompt-draft-project',
              projectId,
              context: { projectId },
            });
            return result;
          }}
          actions={
            dirty ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setText(initial)}
                  disabled={update.isPending}
                >
                  {t('projectSettings.prompt.revert')}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={update.isPending}>
                  {t('projectSettings.prompt.save')}
                </Button>
              </>
            ) : undefined
          }
        />

        <PromptLivePreview
          projectId={projectId}
          issueId={previewIssueId}
          onIssueIdChange={setPreviewIssueId}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      </div>
    </SectionCard>
  );
}

/** 就地干跑预览（增强 C）：选项目任务 → prompt-preview 段清单弹层 */
function PromptLivePreview({
  projectId,
  issueId,
  onIssueIdChange,
  open,
  onOpenChange,
}: {
  projectId: string;
  issueId: string;
  onIssueIdChange: (id: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  // 就地预览样本只取前 20 条（列表页前 20 条 = 项目现有任务的代表性切片）
  const tasks = useProjectTasks(projectId, { pageSize: 20 });
  const rows = tasks.data?.data ?? [];
  const preview = usePromptPreview(open && issueId ? issueId : null);
  const sections = (preview.data?.sections ?? []).filter(
    (s: PromptPreviewSection) => s.injected,
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
        <NativeSelect
          value={issueId}
          onChange={(event) => onIssueIdChange(event.target.value)}
          className="h-8 w-64 text-xs"
          data-ai-component="projectSettings.prompt.previewSelect"
        >
          <NativeSelectOption value="">
            {t('projectSettings.prompt.previewPickTask')}
          </NativeSelectOption>
          {rows.map((task) => (
            <NativeSelectOption key={task.id} value={task.id}>
              {task.title}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 gap-1 text-xs"
          disabled={!issueId}
          onClick={() => onOpenChange(true)}
          data-ai-component="projectSettings.prompt.preview"
          data-ai-action="projectSettings.prompt.preview.click"
        >
          <Eye className="size-3" />
          {t('projectSettings.prompt.previewRun')}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t('projectSettings.prompt.previewHint')}
        </span>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="sm:max-w-xl"
          data-ai-component="projectSettings.prompt.previewDialog"
        >
          <DialogHeader>
            <DialogTitle>{t('projectSettings.prompt.previewTitle')}</DialogTitle>
            <DialogDescription>
              {t('projectSettings.prompt.previewDesc', {
                chars: preview.data?.charCount ?? 0,
              })}
            </DialogDescription>
          </DialogHeader>
          {preview.isLoading ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <RefreshCw className="size-3.5 animate-spin" />
              {t('projectSettings.prompt.previewLoading')}
            </p>
          ) : (
            <div className="max-h-80 space-y-1.5 overflow-y-auto" data-ai-component="projectSettings.prompt.previewSections">
              {sections.map((section) => (
                <div
                  key={section.key}
                  className="rounded-lg border border-border/70 px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">
                      {t(SECTION_LABEL_KEYS[section.key] ?? 'prompt.sections.unknown')}
                    </p>
                    <span className="text-3xs text-muted-foreground/70 tabular-nums">
                      {section.content?.length ?? 0}
                    </span>
                  </div>
                  {section.content ? (
                    <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                      {section.content}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
