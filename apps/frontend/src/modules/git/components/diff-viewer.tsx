import { type DiffResult } from '../api/git-api';
import { cn } from '@/lib/utils';

interface DiffViewerProps {
  diff: DiffResult | null;
  loading?: boolean;
}

interface DiffFileProps {
  path: string;
  status: string;
  additions?: number;
  deletions?: number;
  changes?: number;
}

function DiffFile({ path, status, additions = 0, deletions = 0, changes = 0 }: DiffFileProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'added':
        return '+';
      case 'deleted':
        return '-';
      case 'modified':
        return '~';
      case 'renamed':
        return '→';
      default:
        return '?';
    }
  };

  const statusColorClass = {
    added: 'bg-accent-green',
    deleted: 'bg-accent-red',
    modified: 'bg-accent-yellow',
    renamed: 'bg-accent-purple',
  }[status] ?? 'bg-muted-foreground';

  return (
    <div className="mb-2 rounded border border-border bg-background p-3">
      <div className="mb-2 flex items-center">
        <span className={cn('mr-2 flex h-5 w-5 items-center justify-center rounded text-base font-bold text-white', statusColorClass)}>
          {getStatusIcon(status)}
        </span>
        <span className="font-mono text-xs text-foreground">
          {path}
        </span>
      </div>

      <div className="flex gap-4 text-xs text-muted-foreground">
        {changes > 0 && <span>Total: {changes} changes</span>}
        {additions > 0 && (
          <span className="text-accent-green">+{additions} additions</span>
        )}
        {deletions > 0 && (
          <span className="text-accent-red">-{deletions} deletions</span>
        )}
      </div>
    </div>
  );
}

export function DiffViewer({ diff, loading = false }: DiffViewerProps) {
  if (loading) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading diff...
      </div>
    );
  }

  if (!diff || diff.files.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        No changes to display
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-muted/50 p-4">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-4">
        <h3 className="m-0 text-base font-semibold text-foreground">Diff Summary</h3>
        <div className="flex gap-4 text-sm">
          {diff.totalChanges > 0 && (
            <span className="text-foreground">
              <strong>{diff.totalChanges}</strong> changes
            </span>
          )}
          {diff.totalAdditions > 0 && (
            <span className="text-accent-green">
              +<strong>{diff.totalAdditions}</strong> additions
            </span>
          )}
          {diff.totalDeletions > 0 && (
            <span className="text-accent-red">
              -<strong>{diff.totalDeletions}</strong> deletions
            </span>
          )}
        </div>
      </div>

      <div>
        {diff.files.map((file, index) => (
          <DiffFile
            key={`${file.path}-${index}`}
            path={file.path}
            status={file.status}
            additions={file.additions}
            deletions={file.deletions}
            changes={file.changes}
          />
        ))}
      </div>
    </div>
  );
}
