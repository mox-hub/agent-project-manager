import { useTranslation } from 'react-i18next';
import { GitCommit } from 'lucide-react';
import { AsyncState } from '@/components/ui/async-state';
import { SectionCard } from '@/components/ui/section-card';
import { SkeletonText } from '@/components/ui/skeleton';
import { useCommits } from '../hooks/use-commits';
import type { Commit } from '../api/git-api';

interface CommitListProps {
  repoId: string;
}

/** 仓库提交历史（详情页 Commits 页签唯一实现） */
export function CommitList({ repoId }: CommitListProps) {
  const { t } = useTranslation();
  const { data: commitsData, isLoading, isError, error, refetch } = useCommits(repoId, {
    page: 1,
    pageSize: 30,
  });

  return (
    <AsyncState
      isLoading={isLoading}
      isEmpty={!isLoading && !isError && !commitsData?.items.length}
      error={
        isError ? (error instanceof Error ? error.message : t('git.detail.loadCommitsFailed')) : null
      }
      onRetry={() => refetch()}
      loadingFallback={
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <SkeletonText lines={2} />
            </div>
          ))}
        </div>
      }
      emptyTitle={t('git.detail.noCommits')}
      emptyDescription={t('git.detail.noCommitsHint')}
    >
      <SectionCard title={t('git.detail.recentCommits')} description={t('git.detail.recentCommitsDesc')}>
        <div className="divide-y divide-border">
          {commitsData?.items.map((commit) => (
            <CommitRow key={commit.id} commit={commit} />
          ))}
        </div>
      </SectionCard>
    </AsyncState>
  );
}

function CommitRow({ commit }: { commit: Commit }) {
  const additions = commit.files?.reduce((acc, f) => acc + (f.additions || 0), 0) ?? 0;
  const deletions = commit.files?.reduce((acc, f) => acc + (f.deletions || 0), 0) ?? 0;

  return (
    <div className="flex items-center gap-3 px-1 py-2">
      <GitCommit className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{commit.message}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{commit.authorName}</span>
          <span className="opacity-50">•</span>
          <span className="whitespace-nowrap">{formatRelativeTime(commit.authorDate)}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 text-xs">
        {additions > 0 && <span className="text-accent-green">+{additions}</span>}
        {deletions > 0 && <span className="text-accent-red">-{deletions}</span>}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
          {commit.hash.slice(0, 7)}
        </code>
      </div>
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
