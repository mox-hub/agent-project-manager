/**
 * AcceptanceFormDialog — 新建验收契约弹窗
 * 选择任务 + 完成契约类型（可自动推断）+ 描述；提交 POST /acceptance
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';
import { useAllTasks } from '@/modules/task/hooks/use-project-tasks';
import { useCreateAcceptance } from '../hooks/use-acceptance';
import type { CompletionType } from '../api/acceptance-api';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 预选任务（任务页"生成验收契约"入口使用） */
  defaultTaskId?: string;
  onSuccess?: (acceptanceId: string) => void;
}

const COMPLETION_TYPES: Array<CompletionType | 'auto'> = [
  'auto',
  'artifact',
  'pr',
  'test_report',
  'document',
];

export function AcceptanceFormDialog({
  open,
  onOpenChange,
  defaultTaskId,
  onSuccess,
}: Props) {
  const { t } = useTranslation();
  const { data: tasksData } = useAllTasks({ pageSize: 1000 });
  const createAcceptance = useCreateAcceptance();

  const [taskId, setTaskId] = useState(defaultTaskId ?? '');
  const [title, setTitle] = useState('');
  const [completionType, setCompletionType] = useState<CompletionType | 'auto'>('auto');
  const [description, setDescription] = useState('');

  // 打开时重置表单：渲染期间检测 open 变化调整本地 state（模板同款模式，避免 effect 级联渲染）
  const [prevOpen, setPrevOpen] = useState(false);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (open) {
      setTaskId(defaultTaskId ?? '');
      setTitle('');
      setCompletionType('auto');
      setDescription('');
    }
  }

  const submit = async () => {
    if (!taskId) return;
    try {
      const created = await createAcceptance.mutateAsync({
        taskId,
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        completionType: completionType === 'auto' ? undefined : completionType,
      });
      toast.success(t('common.success'));
      onOpenChange(false);
      onSuccess?.(created.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const availableTasks = (tasksData?.data ?? []).filter((task) => !!task.projectId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('acceptance.form.title')}</DialogTitle>
          <DialogDescription>{t('acceptance.emptyHint')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('acceptance.form.task')}
            </span>
            <NativeSelect
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              className="w-full"
            >
              <option value="">{t('acceptance.form.taskPlaceholder')}</option>
              {availableTasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('acceptance.form.completionType')}
            </span>
            <NativeSelect
              value={completionType}
              onChange={(e) => setCompletionType(e.target.value as CompletionType | 'auto')}
              className="w-full"
            >
              {COMPLETION_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {ty === 'auto'
                    ? t('acceptance.form.completionTypeHint')
                    : t(`acceptance.completionType.${ty}`)}
                </option>
              ))}
            </NativeSelect>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('acceptance.form.name')}
            </span>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t('acceptance.form.description')}
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20 w-full rounded-md border border-border bg-background p-2 text-sm outline-hidden focus:ring-1 focus:ring-primary"
            />
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={!taskId || createAcceptance.isPending}>
            {t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
