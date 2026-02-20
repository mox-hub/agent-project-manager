import { type Repository } from '../api/git-api';

interface RepositoryCardProps {
  repository: Repository;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

export function RepositoryCard({ repository, onClick, onDelete }: RepositoryCardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: 'white',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = '#3b82f6';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h4 style={{ margin: 0, color: '#1f2937', fontWeight: '600' }}>
          {repository.name}
        </h4>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(repository.id);
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
            >
            Delete
          </button>
        )}
      </div>

      {repository.localPath && (
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          <span style={{ fontWeight: '500', marginRight: '4px' }}>Path:</span>
          {repository.localPath}
        </div>
      )}

      {repository.remoteUrl && (
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          <span style={{ fontWeight: '500', marginRight: '4px' }}>Remote:</span>
          {repository.remoteUrl}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {repository.defaultBranch && (
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              borderRadius: '12px',
            }}
          >
            🌿 {repository.defaultBranch}
          </span>
        )}

        {repository.provider && (
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              backgroundColor: '#d1fae5',
              color: '#065f46',
              borderRadius: '12px',
            }}
          >
            🔌 {repository.provider}
          </span>
        )}

        {repository.role && (
          <span
            style={{
              fontSize: '12px',
              padding: '2px 8px',
              backgroundColor: '#ede9fe',
              color: '#7c3aed',
              borderRadius: '12px',
            }}
          >
            👤 {repository.role}
          </span>
        )}
      </div>

      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
        Updated: {new Date(repository.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
