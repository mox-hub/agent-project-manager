import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Layers, Pencil, Plus, Trash2 } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { AsyncState } from '@/components/ui/async-state';
import { DataTableShell } from '@/components/ui/data-table-shell';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useStatuses,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
  type StatusDefinition,
} from '../hooks/use-metadata';
import { cn } from '@/lib/utils';

const STATUS_TYPES = ['task', 'project'] as const;

const TYPE_I18N_KEY: Record<string, string> = {
  task: 'settings.typeTask',
  project: 'settings.typeProject',
};

interface StatusFormData {
  type: string;
  key: string;
  name: string;
  order: number;
  isFinal: boolean;
  isBlockedState: boolean;
  allowedNextStatusKeys: string[];
}

const initialFormData: StatusFormData = {
  type: 'task',
  key: '',
  name: '',
  order: 0,
  isFinal: false,
  isBlockedState: false,
  allowedNextStatusKeys: [],
};

// 展示用启发式映射：按 key/名称推断语义色（仅色点，不自造选中态）
function getStatusDotColor(status: StatusDefinition): string {
  const k = (status.key || '').toLowerCase();
  const n = (status.name || '').toLowerCase();
  if (k === 'done' || n.includes('完成')) return 'bg-accent-green';
  if (k === 'in_progress' || n.includes('进行')) return 'bg-accent-blue';
  if (k === 'review' || n.includes('评审')) return 'bg-accent-yellow';
  return 'bg-muted-foreground';
}

interface TransitionRow {
  fromStatus: StatusDefinition;
  toStatus: StatusDefinition;
  rowKey: string;
}

function buildTransitions(statuses: StatusDefinition[], typeFilter: string): TransitionRow[] {
  const list = typeFilter === '' ? statuses : statuses.filter((s) => s.type === typeFilter);
  const byKey = new Map(list.map((s) => [s.key, s]));
  const rows: TransitionRow[] = [];
  const sorted = [...list].sort((a, b) => a.order - b.order);
  for (const from of sorted) {
    const nextKeys = (from.allowedNextStatusKeys as string[]) || [];
    for (const toKey of nextKeys) {
      const toStatus = byKey.get(toKey);
      if (toStatus) rows.push({ fromStatus: from, toStatus, rowKey: `${from.key}-${toKey}` });
    }
  }
  return rows;
}

export function StatusManager() {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const { isAdmin } = useAuth();
  const [typeFilter, setTypeFilter] = useState<string>('');
  const { data: statuses = [], isLoading, error, refetch } = useStatuses(undefined, undefined);
  const createStatus = useCreateStatus();
  const updateStatus = useUpdateStatus();
  const deleteStatus = useDeleteStatus();

  const statusForm = useForm<StatusFormData>({
    defaultValues: initialFormData,
  });
  const [editing, setEditing] = useState<StatusDefinition | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const sortedStatuses = [...statuses].sort(
    (a, b) => (a.type === b.type ? a.order - b.order : a.type.localeCompare(b.type)),
  );
  const displayStatuses =
    typeFilter === '' ? sortedStatuses : sortedStatuses.filter((s) => s.type === typeFilter);
  const transitions = buildTransitions(statuses, typeFilter);

  // 「允许的下一状态」候选项：同类型且非自身
  const watchType = statusForm.watch('type');
  const nextStatusOptions = sortedStatuses.filter(
    (s) => s.type === watchType && s.key !== editing?.key,
  );

  const openCreate = () => {
    statusForm.reset({ ...initialFormData, type: typeFilter === '' ? 'task' : typeFilter });
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (status: StatusDefinition) => {
    statusForm.reset({
      type: status.type,
      key: status.key,
      name: status.name,
      order: status.order,
      isFinal: status.isFinal,
      isBlockedState: status.isBlockedState,
      allowedNextStatusKeys: (status.allowedNextStatusKeys as string[]) || [],
    });
    setEditing(status);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    statusForm.reset(initialFormData);
    setEditing(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = statusForm.getValues();
    try {
      if (editing) {
        await updateStatus.mutateAsync({ id: editing.id, data: formData });
      } else {
        await createStatus.mutateAsync(formData);
      }
      closeForm();
    } catch {
      toast.error(t('settings.saveFailed'));
    }
  };

  const handleDelete = async (status: StatusDefinition) => {
    const ok = await confirmAction({
      title: t('common.delete'),
      description: t('common.deleteConfirm'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteStatus.mutateAsync(status.id);
    } catch {
      toast.error(t('settings.deleteFailed'));
    }
  };

  return (
    <PageShell
      variant="standard"
      contentClassName="gap-4"
      aiPage="settings.statuses"
      className="bg-background text-foreground"
      title={t('settings.statuses')}
      icon={Layers}
      iconColor="text-accent-yellow"
      metrics={[{ id: 'total', label: t('settings.statuses'), value: displayStatuses.length }]}
      actions={
        // 状态创建是管理员能力（服务端 RolesGuard），普通用户隐藏入口避免必 403
        isAdmin ? (
          <HeaderActionButton icon={Plus} label={t('settings.addStatus')} onClick={openCreate} />
        ) : null
      }
    >
      <div className="flex justify-center">
        <SegmentedControl
          variant="rect"
          value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: '', label: t('common.all') },
                { value: 'task', label: t('settings.typeTask'), tone: 'green' },
                { value: 'project', label: t('settings.typeProject'), tone: 'blue' },
              ]}
            />
          </div>

          <AsyncState
            isLoading={isLoading}
            error={error ? t('settings.statusLoadFailed') : null}
            onRetry={() => void refetch()}
            isEmpty={displayStatuses.length === 0}
            emptyTitle={typeFilter === '' ? t('settings.noStatuses') : t('settings.noStatusesOfType')}
            loadingFallback={
              <DataTableShell>
                <SkeletonTable rows={5} columns={6} />
              </DataTableShell>
            }
          >
            <DataTableShell>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead>{t('settings.statusName')}</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>{t('settings.statusType')}</TableHead>
                    <TableHead className="w-16">{t('settings.statusOrder')}</TableHead>
                    <TableHead>{t('settings.statusFlags')}</TableHead>
                    <TableHead className="w-20 text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayStatuses.map((status) => (
                    <TableRow key={status.id}>
                      <TableCell className="py-1.5">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={cn('size-2 shrink-0 rounded-full', getStatusDotColor(status))}
                          />
                          <span className="font-medium text-foreground">{status.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="py-1.5 font-mono text-xs text-muted-foreground">
                        {status.key}
                      </TableCell>
                      <TableCell className="py-1.5">
                        <Badge variant="outline">{t(TYPE_I18N_KEY[status.type] ?? status.type)}</Badge>
                      </TableCell>
                      <TableCell className="py-1.5 text-muted-foreground">{status.order}</TableCell>
                      <TableCell className="py-1.5">
                        {status.isFinal || status.isBlockedState ? (
                          <span className="inline-flex gap-1">
                            {status.isFinal && <Badge variant="secondary">{t('settings.isFinal')}</Badge>}
                            {status.isBlockedState && (
                              <Badge variant="destructive">{t('settings.isBlockedState')}</Badge>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-1.5 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('common.edit')}
                            title={t('common.edit')}
                            onClick={() => openEdit(status)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label={t('common.delete')}
                            title={t('common.delete')}
                            disabled={deleteStatus.isPending}
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(status)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </DataTableShell>

            <div className="mt-6 flex flex-col gap-2">
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {t('settings.statusTransitions')}
                </h3>
                <p className="text-xs text-muted-foreground">{t('settings.statusTransitionsDesc')}</p>
              </div>
              <DataTableShell>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>{t('settings.transitionFrom')}</TableHead>
                      <TableHead>{t('settings.transitionTo')}</TableHead>
                      <TableHead className="w-20">{t('settings.transitionTrigger')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transitions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="py-6 text-center text-sm text-muted-foreground">
                          {t('settings.transitionsEmpty')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      transitions.map((row) => (
                        <TableRow key={row.rowKey}>
                          <TableCell className="py-1.5">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className={cn(
                                  'size-2 shrink-0 rounded-full',
                                  getStatusDotColor(row.fromStatus),
                                )}
                              />
                              {row.fromStatus.name}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <span className="inline-flex items-center gap-2">
                              <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                              <span
                                className={cn(
                                  'size-2 shrink-0 rounded-full',
                                  getStatusDotColor(row.toStatus),
                                )}
                              />
                              {row.toStatus.name}
                            </span>
                          </TableCell>
                          <TableCell className="py-1.5">
                            <Badge variant="outline">{t('settings.transitionManual')}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </DataTableShell>
            </div>
          </AsyncState>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && closeForm()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('settings.editStatus') : t('settings.addStatus')}</DialogTitle>
            <DialogDescription>{t('settings.statusFormDesc')}</DialogDescription>
          </DialogHeader>
          <Form {...statusForm}>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={statusForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.statusType')} *</FormLabel>
                      <NativeSelect
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        required
                      >
                        {STATUS_TYPES.map((type) => (
                          <NativeSelectOption key={type} value={type}>
                            {t(TYPE_I18N_KEY[type])}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </FormItem>
                  )}
                />
                <FormField
                  control={statusForm.control}
                  name="key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Key *</FormLabel>
                      <Input
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase().replace(/\s+/g, '_'))
                        }
                        placeholder={t('settings.statusKeyPlaceholder')}
                        required
                      />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={statusForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.statusName')} *</FormLabel>
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder={t('settings.statusNamePlaceholder')}
                        required
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={statusForm.control}
                  name="order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('settings.statusOrder')}</FormLabel>
                      <Input
                        type="number"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                        min={0}
                      />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex gap-6">
                <FormField
                  control={statusForm.control}
                  name="isFinal"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      {t('settings.isFinal')}
                    </label>
                  )}
                />
                <FormField
                  control={statusForm.control}
                  name="isBlockedState"
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                      />
                      {t('settings.isBlockedState')}
                    </label>
                  )}
                />
              </div>
              <FormField
                control={statusForm.control}
                name="allowedNextStatusKeys"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('settings.allowedNextStatuses')}</FormLabel>
                    {nextStatusOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        {t('settings.allowedNextStatusesEmpty')}
                      </p>
                    ) : (
                      <CheckboxGroup
                        value={field.value}
                        onValueChange={(value) => field.onChange((value as string[]) ?? [])}
                        className="flex-row flex-wrap gap-x-4 gap-y-2"
                      >
                        {nextStatusOptions.map((s) => (
                          <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                            <Checkbox value={s.key} />
                            {s.name}
                          </label>
                        ))}
                      </CheckboxGroup>
                    )}
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={closeForm}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createStatus.isPending || updateStatus.isPending}>
                  {(createStatus.isPending || updateStatus.isPending) && <Spinner size="sm" />}
                  {editing ? t('common.save') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
