import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { CalendarRange } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  useCreateIteration,
  useUpdateIteration,
} from '../hooks/use-project-tasks';
import type { IterationRef } from '../api/issue-api';

interface IterationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  /** 有值 = 编辑模式（PATCH /iterations/:id）；空 = 创建模式（POST /projects/:id/iterations） */
  iteration?: IterationRef | null;
  onSuccess?: (iteration: IterationRef) => void;
}

interface IterationFormValues {
  name: string;
  startDate: string;
  endDate: string;
}

/** date-only 输入值：ISO 截断到 yyyy-MM-dd（Input type="date" 形态） */
function toInputDate(value?: string | null): string {
  return value ? value.slice(0, 10) : '';
}

/**
 * 迭代创建/编辑对话框（P1-19）。表单：名称 + 起止日期，跟随仓库既有
 * React Hook Form + ui/form Dialog 形态（参照 bind-repository-dialog）。
 * 注意：父组件以 `key={iteration?.id ?? 'new'}` 挂载，保证创建/编辑切换时表单重置。
 */
export function IterationFormDialog({
  open,
  onOpenChange,
  projectId,
  iteration,
  onSuccess,
}: IterationFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!iteration;
  // 缓存失效与错误 toast 收敛在 hooks（use-project-tasks.ts），成功后的关单/重置在组件内
  const createIteration = useCreateIteration(projectId);
  const updateIteration = useUpdateIteration(projectId);

  const form = useForm<IterationFormValues>({
    defaultValues: {
      name: iteration?.name ?? '',
      startDate: toInputDate(iteration?.startDate),
      endDate: toInputDate(iteration?.endDate),
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    const request = isEdit
      ? updateIteration.mutateAsync({
          iterationId: iteration.id,
          data: values,
        })
      : createIteration.mutateAsync(values);
    request
      .then((saved) => {
        onOpenChange(false);
        form.reset();
        onSuccess?.(saved);
      })
      .catch(() => undefined); // 错误已由 hooks toast
  });

  const isPending = createIteration.isPending || updateIteration.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-accent-purple" />
            {isEdit
              ? t('project.milestonesPage.editIteration', '编辑迭代')
              : t('project.milestonesPage.newIteration', '新建迭代')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'project.milestonesPage.iterationFormDesc',
              '按日期区间划分时间段，工单可归属到迭代跟进。',
            )}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              rules={{
                required: t(
                  'project.milestonesPage.iterationNameRequired',
                  '迭代名称必填',
                ),
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('project.milestonesPage.iterationName', '迭代名称')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t(
                        'project.milestonesPage.iterationNamePlaceholder',
                        '例如：Sprint 1',
                      )}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startDate"
                rules={{
                  required: t(
                    'project.milestonesPage.iterationStartDateRequired',
                    '开始日期必填',
                  ),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('project.milestonesPage.iterationStartDate', '开始日期')}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                rules={{
                  required: t(
                    'project.milestonesPage.iterationEndDateRequired',
                    '结束日期必填',
                  ),
                  validate: (value, values) =>
                    !value ||
                    !values.startDate ||
                    value >= values.startDate ||
                    t(
                      'project.milestonesPage.iterationEndDateInvalid',
                      '结束日期不能早于开始日期',
                    ),
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('project.milestonesPage.iterationEndDate', '结束日期')}
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-9" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                {t('common.cancel', '取消')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEdit
                  ? t('common.save', '保存')
                  : t('common.create', '创建')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
