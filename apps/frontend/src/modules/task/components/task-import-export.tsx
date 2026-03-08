import { useState, useRef } from 'react';
import { notionColors, notionTypography, notionSpacing, notionRadii } from '@/shared/theme/notion-tokens';
import { Button } from '@/components/ui/button';
import { useImportTasks, useExportTasks } from '../hooks/use-project-tasks';
import type { Task, CreateTaskRequest } from '../api/task-api';

interface TaskImportExportProps {
  projectId: string;
}

export function TaskImportExport({ projectId }: TaskImportExportProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div style={{ display: 'flex', gap: notionSpacing.sm }}>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowImportModal(true)}
        style={{
          border: `1px solid ${notionColors.border.default}`,
          color: notionColors.text.primary,
        }}
      >
        Import
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setShowExportModal(true)}
        style={{
          border: `1px solid ${notionColors.border.default}`,
          color: notionColors.text.primary,
        }}
      >
        Export
      </Button>

      {showImportModal && (
        <ImportModal
          projectId={projectId}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {showExportModal && (
        <ExportModal
          projectId={projectId}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </div>
  );
}

function ImportModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState<CreateTaskRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const importTasks = useImportTasks();

  const parseCSV = (content: string) => {
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      setError('CSV file must have a header row and at least one data row');
      return;
    }

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const tasks: CreateTaskRequest[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const task: any = { projectId };

      headers.forEach((header, idx) => {
        const value = values[idx] || '';
        switch (header) {
          case 'title':
            task.title = value;
            break;
          case 'description':
            task.description = value;
            break;
          case 'status':
            task.status = value;
            break;
          case 'priority':
            task.priority = value as any;
            break;
          case 'estimate':
            task.estimate = parseFloat(value) || undefined;
            break;
          case 'dueDate':
            task.dueDate = value || undefined;
            break;
        }
      });

      if (task.title) {
        tasks.push(task);
      }
    }

    if (tasks.length === 0) {
      setError('No valid tasks found in CSV');
      return;
    }

    setPreview(tasks);
    setError(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      parseCSV(content);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    try {
      await importTasks.mutateAsync({ projectId, tasks: preview });
      onClose();
    } catch (err) {
      setError('Failed to import tasks');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(55, 53, 47, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: notionColors.background.default,
          borderRadius: notionRadii.xl,
          boxShadow: `0 0 0 1px ${notionColors.border.default}, 0 ${notionSpacing['2xl']}px ${notionSpacing['2xl']}px ${notionColors.shadow.lg}`,
          width: '100%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: notionSpacing['2xl'] }}>
          <h3 style={{ margin: `0 0 ${notionSpacing.md}`, fontSize: notionTypography.fontSize.lg }}>
            Import Tasks
          </h3>
          <p style={{ margin: `0 0 ${notionSpacing.lg}`, fontSize: notionTypography.fontSize.sm, color: notionColors.text.secondary }}>
            Upload a CSV file with columns: title, description, status, priority, estimate, dueDate
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            style={{
              marginBottom: notionSpacing.md,
              padding: notionSpacing.md,
              border: `1px dashed ${notionColors.border.default}`,
              borderRadius: notionRadii.md,
              width: '100%',
            }}
          />

          {error && (
            <div
              style={{
                padding: notionSpacing.md,
                backgroundColor: notionColors.accent.redLight,
                color: notionColors.accent.red,
                borderRadius: notionRadii.md,
                marginBottom: notionSpacing.md,
                fontSize: notionTypography.fontSize.sm,
              }}
            >
              {error}
            </div>
          )}

          {preview.length > 0 && (
            <div style={{ marginBottom: notionSpacing.md }}>
              <h4 style={{ margin: `0 0 ${notionSpacing.sm}`, fontSize: notionTypography.fontSize.sm }}>
                Preview ({preview.length} tasks):
              </h4>
              <div
                style={{
                  maxHeight: 200,
                  overflow: 'auto',
                  border: `1px solid ${notionColors.border.default}`,
                  borderRadius: notionRadii.md,
                }}
              >
                {preview.map((task, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: notionSpacing.sm,
                      borderBottom: `1px solid ${notionColors.border.default}`,
                      fontSize: notionTypography.fontSize.sm,
                    }}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: notionSpacing.sm }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={preview.length === 0 || importTasks.isPending}
              style={{
                backgroundColor: notionColors.accent.blue,
                color: '#fff',
              }}
            >
              {importTasks.isPending ? 'Importing...' : `Import ${preview.length} Tasks`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');
  const exportTasks = useExportTasks();

  const handleExport = async () => {
    try {
      const response = await exportTasks.mutateAsync({ projectId, format });

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = response.data as unknown as any[];
        const headers = ['title', 'description', 'status', 'priority', 'estimate', 'dueDate'];
        const csvContent = [
          headers.join(','),
          ...data.map((task) =>
            headers
              .map((h) => {
                const value = task[h] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
              })
              .join(',')
          ),
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.csv';
        a.click();
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(55, 53, 47, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: notionColors.background.default,
          borderRadius: notionRadii.xl,
          boxShadow: `0 0 0 1px ${notionColors.border.default}, 0 ${notionSpacing['2xl']}px ${notionSpacing['2xl']}px ${notionColors.shadow.lg}`,
          width: '100%',
          maxWidth: '400px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: notionSpacing['2xl'] }}>
          <h3 style={{ margin: `0 0 ${notionSpacing.md}`, fontSize: notionTypography.fontSize.lg }}>
            Export Tasks
          </h3>
          <p style={{ margin: `0 0 ${notionSpacing.lg}`, fontSize: notionTypography.fontSize.sm, color: notionColors.text.secondary }}>
            Choose export format:
          </p>

          <div style={{ display: 'flex', gap: notionSpacing.md, marginBottom: notionSpacing.lg }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: notionSpacing.sm,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="format"
                value="csv"
                checked={format === 'csv'}
                onChange={() => setFormat('csv')}
              />
              CSV
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: notionSpacing.sm,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="format"
                value="json"
                checked={format === 'json'}
                onChange={() => setFormat('json')}
              />
              JSON
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: notionSpacing.sm }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleExport}
              disabled={exportTasks.isPending}
              style={{
                backgroundColor: notionColors.accent.blue,
                color: '#fff',
              }}
            >
              {exportTasks.isPending ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
