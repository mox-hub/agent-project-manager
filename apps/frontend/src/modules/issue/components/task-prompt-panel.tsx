/**
 * 任务提示词面板（CAP-A-24 + 增强 A/B）：任务级自定义提示词
 * （Issue.metadata.taskPrompt），注入该任务派发 prompt 的「Task Instructions」段；
 * 派发组装时按当单事实插值 {{issue.*}} 变量。空文本=未配置（不注入）。
 * - 从模板选用（增强 A）：模板库 + 插值干跑预览，采用后写入编辑框。
 * - AI 起草（增强 B）：静默场景 prompt-draft-task，草稿只进编辑框，
 *   保存由父级走 updateField({ metadata }) 既有 PATCH 通道（人确认生效）。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutTemplate, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarPanel } from '@/components/ui/sidebar-panel';
import { PromptEditor } from '@/shared/components/prompt-editor';
import { TemplatePickerDialog } from '@/modules/prompt/components/template-picker-dialog';
import { useSilentPromptDraft } from '@/modules/assistant/hooks/use-silent-ai';

function extractTaskPrompt(metadata?: Record<string, unknown> | null): string {
  const value = metadata?.taskPrompt;
  return typeof value === 'string' ? value : '';
}

export function TaskPromptPanel({
  issueId,
  metadata,
  onSave,
}: {
  issueId: string;
  metadata?: Record<string, unknown> | null;
  onSave: (value: string) => Promise<void>;
}) {
  return (
    <TaskPromptEditor
      key={issueId}
      issueId={issueId}
      initial={extractTaskPrompt(metadata)}
      onSave={onSave}
    />
  );
}

function TaskPromptEditor({
  issueId,
  initial,
  onSave,
}: {
  issueId: string;
  initial: string;
  onSave: (value: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const draft = useSilentPromptDraft();
  const dirty = text !== initial;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(text);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarPanel
      title={t('taskDetail.promptPanel')}
      icon={<Sparkles className="size-3" />}
      iconClassName="text-accent-blue"
    >
      <PromptEditor
        value={text}
        onChange={setText}
        placeholder={t('taskDetail.promptPlaceholder')}
        rows={4}
        maxHeight={280}
        onDraft={async () => {
          const result = await draft.mutateAsync({
            scenario: 'prompt-draft-task',
            context: { issueId },
          });
          return result;
        }}
        actions={
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1"
              onClick={() => setPickerOpen(true)}
              data-ai-component="taskDetail.promptPanel.pickTemplate"
              data-ai-action="taskDetail.promptPanel.pickTemplate.click"
            >
              <LayoutTemplate className="size-3" />
              {t('taskDetail.promptPickTemplate')}
            </Button>
            {dirty ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setText(initial)}
                  disabled={saving}
                >
                  {t('taskDetail.promptRevert')}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {t('taskDetail.promptSave')}
                </Button>
              </>
            ) : null}
          </div>
        }
      />
      <TemplatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        target="task"
        issueId={issueId}
        onApply={(next) => setText(next)}
      />
    </SidebarPanel>
  );
}
