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
      <div className="p-6 text-center text-content-text-secondary">No commits found</div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold text-content-text">Recent Commits</h3>
      <div className="flex flex-col gap-2">
        {commitsData.data.map((commit) => (
          <div
            key={commit.id}
            className="rounded-lg border border-content-border p-3"
          >
            <div className="mb-1 font-medium text-content-text">{commit.message}</div>
            <div className="mb-1 text-xs text-content-text-secondary">
              {commit.authorName} • {new Date(commit.authorDate).toLocaleString()}
            </div>
            <div className="font-mono text-xs text-content-text-tertiary">
              {commit.hash.substring(0, 7)}
            </div>
            {commit.files && commit.files.length > 0 && (
              <div className="mt-1 text-xs text-content-text-secondary">
                {commit.files.length} file(s) changed
                {commit.files.reduce(
                  (acc, f) => acc + (f.additions || 0),
                  0,
                ) > 0 && (
                  <span className="ml-2 text-accent-green">
                    +{commit.files.reduce((acc, f) => acc + (f.additions || 0), 0)}
                  </span>
                )}
                {commit.files.reduce(
                  (acc, f) => acc + (f.deletions || 0),
                  0,
                ) > 0 && (
                  <span className="ml-2 text-accent-red">
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
