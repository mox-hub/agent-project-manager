import { useCommits } from '../hooks/use-commits';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CommitListProps {
  repoId: string;
}

export function CommitList({ repoId }: CommitListProps) {
  const { data: commitsData, isLoading, isError, error, refetch } = useCommits(repoId, {
    page: 1,
    pageSize: 20,
  });

  if (isLoading) {
    return <div>Loading commits...</div>;
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>加载失败</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : '无法加载提交记录'}
        </AlertDescription>
        <button onClick={() => refetch()} className="mt-2 text-sm underline">
          重试
        </button>
      </Alert>
    );
  }

  if (!commitsData || commitsData.items.length === 0) {
    return (
      <div className="p-6 text-center text-muted-foreground">No commits found</div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold text-foreground">Recent Commits</h3>
      <div className="flex flex-col gap-2">
        {commitsData.items.map((commit) => (
          <div
            key={commit.id}
            className="rounded-lg border border-border p-3"
          >
            <div className="mb-1 font-medium text-foreground">{commit.message}</div>
            <div className="mb-1 text-xs text-muted-foreground">
              {commit.authorName} • {new Date(commit.authorDate).toLocaleString()}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {commit.hash.substring(0, 7)}
            </div>
            {commit.files && commit.files.length > 0 && (
              <div className="mt-1 text-xs text-muted-foreground">
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
