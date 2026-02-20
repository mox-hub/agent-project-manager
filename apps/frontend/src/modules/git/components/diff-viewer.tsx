import { type DiffResult } from '../api/git-api';

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
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return '#10b981';
      case 'deleted':
        return '#ef4444';
      case 'modified':
        return '#f59e0b';
      case 'renamed':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

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

  return (
    <div
      style={{
        padding: '12px',
        border: '1px solid #e5e7eb',
        borderRadius: '4px',
        backgroundColor: 'white',
        marginBottom: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '16px',
            marginRight: '8px',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: getStatusColor(status),
            color: 'white',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
        >
          {getStatusIcon(status)}
        </span>
        <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#374151' }}>
          {path}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280' }}>
        {changes > 0 && <span>Total: {changes} changes</span>}
        {additions > 0 && (
          <span style={{ color: '#10b981' }}>+{additions} additions</span>
        )}
        {deletions > 0 && (
          <span style={{ color: '#ef4444' }}>-{deletions} deletions</span>
        )}
      </div>
    </div>
  );
}

export function DiffViewer({ diff, loading = false }: DiffViewerProps) {
  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        Loading diff...
      </div>
    );
  }

  if (!diff || diff.files.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#6b7280' }}>
        No changes to display
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <h3 style={{ margin: 0 }}>Diff Summary</h3>
        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
          {diff.totalChanges > 0 && (
            <span>
              <strong>{diff.totalChanges}</strong> changes
            </span>
          )}
          {diff.totalAdditions > 0 && (
            <span style={{ color: '#10b981' }}>
              +<strong>{diff.totalAdditions}</strong> additions
            </span>
          )}
          {diff.totalDeletions > 0 && (
            <span style={{ color: '#ef4444' }}>
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
