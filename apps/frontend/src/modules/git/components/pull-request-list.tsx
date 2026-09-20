import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitPullRequest } from 'lucide-react';
import { usePullRequests } from '../hooks/use-pull-requests';
import { PullRequestCard } from './pull-request-card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonList } from '@/components/ui/skeleton';

interface PullRequestListProps {
  repoId: string;
}

const PR_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'merged', label: 'Merged' },
  { value: 'draft', label: 'Draft' },
];

export function PullRequestList({ repoId }: PullRequestListProps) {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState('');

  const { data: pullRequests, isLoading, error } = usePullRequests(
    repoId,
    statusFilter ? { status: statusFilter } : undefined,
  );

  if (isLoading) {
    return <SkeletonList count={3} />;
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        {t('git.pulls.loadFailed', 'Failed to load pull requests')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 w-45"
        >
          {PR_STATUS_OPTIONS.map((opt) => (
            <NativeSelectOption key={opt.value} value={opt.value}>
              {opt.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        <span className="text-sm text-muted-foreground">
          {pullRequests?.length ?? 0} pull request(s)
        </span>
      </div>

      {!pullRequests || pullRequests.length === 0 ? (
        <EmptyState
          icon={GitPullRequest}
          title={t('git.pulls.empty', '暂无 Pull Request')}
          description={t('git.pulls.emptyHint', '该仓库还没有 PR 记录，集成同步后将出现在这里')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {pullRequests.map((pr) => {
            const htmlUrl =
              typeof pr.metadata?.htmlUrl === 'string'
                ? pr.metadata.htmlUrl
                : undefined;
            return (
              <PullRequestCard
                key={pr.id}
                pullRequest={pr}
                onClick={
                  htmlUrl
                    ? () =>
                        window.open(htmlUrl, '_blank', 'noopener,noreferrer')
                    : undefined
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
