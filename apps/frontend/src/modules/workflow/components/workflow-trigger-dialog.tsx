/**
 * 工作流触发对话框（可选 JSON 入参）——列表页与详情页共用。
 * 触发成功后携带 runId 跳详情页，直接进入运行面板（CAP-S-03 呈现层）。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTriggerWorkflow } from '../hooks/use-workflows';
import type { WorkflowSummary } from '../api/workflow-api';

export function WorkflowTriggerDialog({
  target,
  onClose,
  open,
}: {
  target: WorkflowSummary | null;
  onClose: () => void;
  /** 受控开关；缺省按 target 非 null 打开（列表页模式） */
  open?: boolean;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [parametersText, setParametersText] = useState('{}');
  const trigger = useTriggerWorkflow(target?.id ?? '');
  const isOpen = open ?? Boolean(target);

  const handleRun = () => {
    if (!target) return;
    let parameters: Record<string, unknown> = {};
    const trimmed = parametersText.trim();
    if (trimmed) {
      try {
        parameters = JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        toast(t('workflow.invalidJson'));
        return;
      }
    }
    trigger.mutate(
      { parameters },
      {
        onSuccess: (res) => {
          toast(t('workflow.triggered'));
          onClose();
          navigate(`/app/workflows/${target.id}?runId=${res.workflowRunId}`);
        },
        onError: () => toast(t('workflow.triggerFailed')),
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('workflow.runDialogTitle', { name: target?.name ?? '' })}</DialogTitle>
          <DialogDescription>{t('workflow.runDialogHint')}</DialogDescription>
        </DialogHeader>
        <textarea
          value={parametersText}
          onChange={(e) => setParametersText(e.target.value)}
          rows={5}
          spellCheck={false}
          className="w-full rounded-md border border-border bg-transparent p-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder='{ "topic": "..." }'
        />
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleRun} disabled={trigger.isPending}>
            <Play className="mr-1 size-3" />
            {t('workflow.run')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
