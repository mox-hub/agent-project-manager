/**
 * 任务提示词面板（CAP-A-24）：任务级自定义提示词（Issue.metadata.taskPrompt），
 * 注入该任务派发 prompt 的「Task Instructions」段；空文本=未配置（不注入）。
 * 编辑态所见即所得（PromptEditor→MarkdownLiveEditor），保存由父级走
 * updateField({ metadata }) 既有 PATCH 通道。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SidebarPanel } from '@/components/ui/sidebar-panel';
import { PromptEditor } from '@/shared/components/prompt-editor';

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
      initial={extractTaskPrompt(metadata)}
      onSave={onSave}
    />
  );
}

function TaskPromptEditor({
  initial,
  onSave,
}: {
  initial: string;
  onSave: (value: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(initial);
  const [saving, setSaving] = useState(false);
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
        actions={
          dirty ? (
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
          ) : undefined
        }
      />
    </SidebarPanel>
  );
}
