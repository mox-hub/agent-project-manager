import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Task } from '../api/issue-api';

type ExportFormat = 'csv' | 'json';

interface GlobalTaskExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 当前筛选结果集（导出范围 = 列表当前所见，避免「导出的和我看到的不一样」） */
  tasks: Task[];
  getProjectName?: (projectId: string | null | undefined) => string;
  /** P2-17：范围说明由调用方给出（全局任务页分页后 = 当前页的筛选结果） */
  scopeNote?: string;
  /** P2-17：分页补充说明（多页时提示仅含本页数据，翻页可再导出） */
  pageNote?: string;
}

/**
 * 导出行：与项目页导出（/issues/export）同构的可读字段投影；
 * 额外补充 id/shortId/project/assignee/severity/createdAt 等全局视图上下文字段。
 * CSV 列保持 import 可解析的超集（导入只映射已知列，多列被忽略）。
 */
interface ExportRow {
  id: string;
  shortId: string;
  title: string;
  description: string;
  project: string;
  status: string;
  priority: string;
  severity: string;
  assignee: string;
  estimate: number | '';
  dueDate: string;
  createdAt: string;
}

const CSV_HEADERS = [
  'id',
  'shortId',
  'title',
  'description',
  'project',
  'status',
  'priority',
  'severity',
  'assignee',
  'estimate',
  'dueDate',
  'createdAt',
] as const;

function toCsv(rows: ExportRow[]) {
  return [
    CSV_HEADERS.join(','),
    ...rows.map((row) =>
      CSV_HEADERS.map((header) => {
        const value = row[header] ?? '';
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(','),
    ),
  ].join('\n');
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * 全局任务页导出（P1-15）：后端 /issues/export 为项目级端点（projectId 必填），
 * 全局视图为跨项目集合，故前端从当前筛选结果生成文件（零后端改动）。
 * UI 明示导出范围 =「当前筛选结果」，与列表所见一致。
 */
export function GlobalTaskExportDialog({
  open,
  onOpenChange,
  tasks,
  getProjectName,
  scopeNote,
  pageNote,
}: GlobalTaskExportDialogProps) {
  const { t } = useTranslation();
  const [format, setFormat] = useState<ExportFormat>('csv');

  const buildRows = (): ExportRow[] =>
    tasks.map((task) => ({
      id: task.id,
      shortId: task.shortId || task.externalIdentifier || '',
      title: task.title,
      description: task.description ?? '',
      project: task.projectId ? (getProjectName?.(task.projectId) ?? '') : '',
      status: task.status ?? '',
      priority: task.priority ?? '',
      severity: task.severity ?? '',
      assignee: task.assignee?.displayName || task.assignee?.username || task.aiAgent?.name || '',
      estimate: task.estimate ?? '',
      dueDate: task.dueDate ?? '',
      createdAt: task.createdAt ?? '',
    }));

  const handleExport = () => {
    const rows = buildRows();
    const dateTag = new Date().toISOString().slice(0, 10);
    if (format === 'json') {
      download(`issues-export-${dateTag}.json`, JSON.stringify(rows, null, 2), 'application/json');
    } else {
      download(`issues-export-${dateTag}.csv`, toCsv(rows), 'text/csv');
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onOpenChange(false)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download size={16} className="text-accent-blue" />
            {t('task.export.globalTitle', '导出任务')}
          </DialogTitle>
          <DialogDescription>
            {scopeNote ??
              t(
                'task.export.scopeNote',
                '导出范围：当前筛选结果（{{count}} 条）——与列表当前的搜索、筛选和排序一致，而非全部工单。',
                { count: tasks.length },
              )}
          </DialogDescription>
          {pageNote ? <p className="text-xs text-muted-foreground">{pageNote}</p> : null}
        </DialogHeader>

        <fieldset className="space-y-3">
          <legend className="sr-only">{t('task.export.formatLegend', '导出格式')}</legend>
          <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
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
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t('common.cancel', '取消')}
          </Button>
          <Button onClick={handleExport} disabled={tasks.length === 0}>
            {t('task.export.confirm', '导出 {{count}} 条', { count: tasks.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
