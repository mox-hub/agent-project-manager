import React from 'react';
import { type PullRequest } from '../api/git-api';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';

interface PullRequestCardProps {
  pullRequest: PullRequest;
  onClick?: () => void;
}

function getPrStatusTone(status: string): 'success' | 'warning' | 'danger' | 'info' {
  switch (status.toLowerCase()) {
    case 'open':
    case 'active':
    case 'merged':
      return 'success';
    case 'closed':
      return 'danger';
    case 'draft':
    case 'pending':
      return 'warning';
    default:
      return 'info';
  }
}

export function PullRequestCard({ pullRequest, onClick }: PullRequestCardProps) {
  return (
    <Card
      className={`p-4 ${onClick ? 'cursor-pointer hover:border-accent-blue' : ''}`}
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-semibold text-foreground leading-tight">
              {pullRequest.title}
            </h4>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>by {pullRequest.author}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{new Date(pullRequest.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <StatusPill tone={getPrStatusTone(pullRequest.status)}>
            {pullRequest.status}
          </StatusPill>
        </div>

        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            <span className="text-muted-foreground">←</span> {pullRequest.targetBranch}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <span className="text-muted-foreground">→</span> {pullRequest.sourceBranch}
          </Badge>
        </div>

        {pullRequest.labels && pullRequest.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pullRequest.labels.map((label) => (
              <Badge key={label} variant="secondary" className="text-xs">
                {label}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
