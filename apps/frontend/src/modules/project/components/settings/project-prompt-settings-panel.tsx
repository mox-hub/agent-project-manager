/**
 * 项目设置 · 提示词分页面板（CAP-A-24）：
 * 项目级提示词编辑（Markdown 所见即所得）——注入到该项目全部派发 prompt 的
 * 「Project Instructions」段；空文本=未配置（不注入）。保存走
 * PUT /prompts/config { projectId, projectPrompt }，空串即清空。
 * 服务端值到位后才挂编辑器（初始态一次性注入），避免 effect 同步 setState。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { SectionCard } from '@/components/ui/section-card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/toast';
import { PromptEditor } from '@/shared/components/prompt-editor';
import {
  usePromptConfig,
  useUpdatePromptConfig,
} from '@/modules/prompt/api/prompt-api';

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
    />
  );
}

function ProjectPromptEditorPanel({
  projectId,
  initial,
}: {
  projectId: string;
  initial: string;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  const update = useUpdatePromptConfig();
  const dirty = text !== initial;

  const handleSave = async () => {
    try {
      await update.mutateAsync({ projectId, projectPrompt: text });
      toast.success(t('projectSettings.prompt.saved'));
    } catch {
      // 失败提示由 mutation onError 统一弹出
    }
  };

  return (
    <SectionCard
      title={t('projectSettings.prompt.title')}
      description={t('projectSettings.prompt.desc')}
    >
      <PromptEditor
        value={text}
        onChange={setText}
        placeholder={t('projectSettings.prompt.placeholder')}
        rows={6}
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
    </SectionCard>
  );
}
