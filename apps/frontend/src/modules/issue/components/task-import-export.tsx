import { useState, type ChangeEvent } from 'react';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useImportTasks, useExportTasks } from '../hooks/use-project-tasks';
import { useTranslation } from 'react-i18next';
import type { CreateTaskRequest, TaskPriority } from '../api/issue-api';

interface TaskImportExportProps {
  projectId: string;
}

type ExportFormat = 'csv' | 'json';

/** 后端 400 error.details.errors 的逐行导入错误（P0-8b） */
interface ImportRowError {
  row: number;
  field?: string;
  message: string;
}

/** 从 ApiClientError.details 中提取逐行导入错误（鸭子类型判定，避免耦合错误类） */
function extractImportRowErrors(err: unknown): ImportRowError[] {
  const details = (err as { details?: { errors?: unknown } } | null)?.details;
  const errors = details?.errors;
  if (!Array.isArray(errors)) return [];
  return errors.filter(
    (e): e is ImportRowError =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as ImportRowError).message === 'string',
  );
}

type ExportTaskRow = {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  estimate?: number;
  dueDate?: string;
};

const CSV_HEADERS = ['title', 'description', 'status', 'priority', 'estimate', 'dueDate'] as const;

function normalizePriority(value: string): TaskPriority | undefined {
  if (value === 'low' || value === 'medium' || value === 'high' || value === 'critical') {
    return value;
  }
  return undefined;
}

function tasksToCsv(rows: ExportTaskRow[]) {
  return [
    CSV_HEADERS.join(','),
    ...rows.map((task) =>
      CSV_HEADERS.map((header) => {
        const value = task[header] ?? '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','),
    ),
  ].join('\n');
}

export function TaskImportExport({ projectId }: TaskImportExportProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="flex gap-2">
      <Button variant="secondary" size="sm" onClick={() => setShowImportModal(true)}>
        Import
      </Button>
      <Button variant="secondary" size="sm" onClick={() => setShowExportModal(true)}>
        Export
      </Button>

      <ImportModal projectId={projectId} open={showImportModal} onClose={() => setShowImportModal(false)} />
      <ExportModal projectId={projectId} open={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
}

function ImportModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [preview, setPreview] = useState<CreateTaskRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const importTasks = useImportTasks();

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      setError('CSV file must have a header row and at least one data row');
      setPreview([]);
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const tasks: CreateTaskRequest[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const draft: Partial<CreateTaskRequest> & { projectId: string } = { projectId };

      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        if (header === 'title') draft.title = value;
        if (header === 'description') draft.description = value;
        if (header === 'status') draft.status = value;
        if (header === 'priority') draft.priority = normalizePriority(value);
        if (header === 'estimate') draft.estimate = Number.parseFloat(value) || undefined;
        if (header === 'duedate') draft.dueDate = value || undefined;
      });

      if (draft.title) {
        tasks.push(draft as CreateTaskRequest);
      }
    }

    if (tasks.length === 0) {
      setError('No valid tasks found in CSV');
      setPreview([]);
      return;
    }

    setPreview(tasks);
    setError(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result ?? '');
      setRowErrors([]);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    try {
      await importTasks.mutateAsync({ projectId, tasks: preview });
      onClose();
      setPreview([]);
      setError(null);
      setRowErrors([]);
    } catch (err) {
      // P0-8b：后端任一行校验失败会整批拒绝（400 + details.errors），逐行展示
      const importRowErrors = extractImportRowErrors(err);
      setRowErrors(importRowErrors);
      if (importRowErrors.length > 0) {
        setError(
          t(
            'task.import.validationFailed',
            '导入校验失败，本次导入未创建任何任务，共 {{count}} 处错误',
            { count: importRowErrors.length },
          ),
        );
      } else {
        setError('Failed to import tasks');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-dialog-scroll overflow-auto">
        <DialogHeader>
          <DialogTitle>Import Tasks</DialogTitle>
          <DialogDescription>
            Upload a CSV file with columns: title, description, status, priority, estimate, dueDate
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-import-file">CSV File</Label>
            <Input
              id="task-import-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full rounded-md border border-dashed border-border bg-background px-3 py-2 text-sm text-foreground"
            />
          </div>

          {error ? (
            <div className="rounded-md bg-accent-red-light px-3 py-2 text-sm text-accent-red">{error}</div>
          ) : null}

          {rowErrors.length > 0 ? (
            <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
              {rowErrors.map((rowError, idx) => (
                <div key={`${rowError.row}-${idx}`} className="text-accent-red">
                  {rowError.message}
                </div>
              ))}
            </div>
          ) : null}

          {preview.length > 0 ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Preview ({preview.length} tasks)</h4>
              <div className="max-h-52 overflow-auto rounded-md border border-border">
                {preview.map((task, idx) => (
                  <div
                    key={`${task.title}-${idx}`}
                    className="border-b border-border px-3 py-2 text-sm text-foreground last:border-b-0"
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={preview.length === 0 || importTasks.isPending}>
            {importTasks.isPending ? 'Importing...' : `Import ${preview.length} Tasks`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExportModal({
  projectId,
  open,
  onClose,
}: {
  projectId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [format, setFormat] = useState<ExportFormat>('csv');
  const exportTasks = useExportTasks();

  const handleExport = async () => {
    try {
      const response = await exportTasks.mutateAsync({ projectId, format });

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const rows = (response as unknown as ExportTaskRow[]) ?? [];
        const blob = new Blob([tasksToCsv(rows)], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.csv';
        a.click();
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Tasks</DialogTitle>
          <DialogDescription>Choose export format.</DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-3">
          <legend className="sr-only">Export format</legend>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <RadioGroupItem value="csv" />
              CSV
            </label>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <RadioGroupItem value="json" />
              JSON
            </label>
          </RadioGroup>
        </fieldset>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exportTasks.isPending}>
            {exportTasks.isPending ? 'Exporting...' : 'Export'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
