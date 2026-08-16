import React, { useState } from 'react';
import { usePullRequests } from '../hooks/use-pull-requests';
import { PullRequestCard } from './pull-request-card';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Spinner } from '@/components/ui/spinner';

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
  const [statusFilter, setStatusFilter] = useState('');

  const { data: pullRequests, isLoading, error } = usePullRequests(
    repoId,
    statusFilter ? { status: statusFilter } : undefined,
  );

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Spinner />
        <span>Loading pull requests...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        Failed to load pull requests
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <NativeSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 w-[180px]"
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
        <div className="p-6 text-center text-sm text-muted-foreground">
          No pull requests found
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pullRequests.map((pr) => (
            <PullRequestCard key={pr.id} pullRequest={pr} />
          ))}
        </div>
      )}
    </div>
  );
}
