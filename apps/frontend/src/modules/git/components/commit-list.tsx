import { useCommits } from '../hooks/use-commits';

interface CommitListProps {
  repoId: string;
}

export function CommitList({ repoId }: CommitListProps) {
  const { data: commitsData, isLoading } = useCommits(repoId, {
    page: 1,
    pageSize: 20,
  });

  if (isLoading) {
    return <div>Loading commits...</div>;
  }

  if (!commitsData || commitsData.data.length === 0) {
    return (
      <div style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
        No commits found
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ marginBottom: '16px' }}>Recent Commits</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {commitsData.data.map((commit) => (
          <div
            key={commit.id}
            style={{
              padding: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
          >
            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
              {commit.message}
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              {commit.authorName} • {new Date(commit.authorDate).toLocaleString()}
            </div>
            <div style={{ fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace' }}>
              {commit.hash.substring(0, 7)}
            </div>
            {commit.files && commit.files.length > 0 && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                {commit.files.length} file(s) changed
                {commit.files.reduce(
                  (acc, f) => acc + (f.additions || 0),
                  0,
                ) > 0 && (
                  <span style={{ color: '#10b981', marginLeft: '8px' }}>
                    +{commit.files.reduce((acc, f) => acc + (f.additions || 0), 0)}
                  </span>
                )}
                {commit.files.reduce(
                  (acc, f) => acc + (f.deletions || 0),
                  0,
                ) > 0 && (
                  <span style={{ color: '#ef4444', marginLeft: '8px' }}>
                    -{commit.files.reduce((acc, f) => acc + (f.deletions || 0), 0)}
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
