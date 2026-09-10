/**
 * Workflow 列表页（CAP-A-11 基座）——定义卡片 + 触发对话框。
 * 「运行」支持可选 JSON 入参（demo 工作流只需 { "topic": "..." }）。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { GitBranch, Play, Workflow as WorkflowIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { PageShell } from '@/components/ui/page-shell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { useTriggerWorkflow, useWorkflowEvents, useWorkflows } from '../hooks/use-workflows';
import type { WorkflowSummary } from '../api/workflow-api';

export function WorkflowListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: workflows, isLoading } = useWorkflows();
  useWorkflowEvents();

  const [triggerTarget, setTriggerTarget] = useState<WorkflowSummary | null>(null);

  return (
    <PageShell>
      <PageHeader title={t('workflow.title')} icon={WorkflowIcon} />
      <p className="mt-1 text-xs text-muted-foreground">{t('workflow.description')}</p>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : !workflows || workflows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">{t('workflow.empty')}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workflows.map((wf) => (
            <Card
              key={wf.id}
              className="transition-colors hover:border-border/80 hover:bg-muted/30"
            >
              <CardContent className="flex h-full flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-2 text-left"
                    onClick={() => navigate(`/app/workflows/${wf.id}`)}
                  >
                    <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate text-sm font-medium hover:underline">
                      {wf.name}
                    </span>
                  </button>
                  <Badge variant="secondary" className="shrink-0">
                    v{wf.version}
                  </Badge>
                </div>
                <button
                  type="button"
                  className="text-left"
                  onClick={() => navigate(`/app/workflows/${wf.id}`)}
                >
                  <p className="line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                    {wf.description || t('workflow.noDescription')}
                  </p>
                </button>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <code className="truncate text-11 text-muted-foreground/60">{wf.key}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 px-2.5 text-xs"
                    onClick={() => setTriggerTarget(wf)}
                  >
                    <Play className="size-3" />
                    {t('workflow.run')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <TriggerDialog target={triggerTarget} onClose={() => setTriggerTarget(null)} />
    </PageShell>
  );
}

function TriggerDialog({
  target,
  onClose,
}: {
  target: WorkflowSummary | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [parametersText, setParametersText] = useState('{}');
  const trigger = useTriggerWorkflow(target?.id ?? '');

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
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
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
