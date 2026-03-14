import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { type Repository } from "../api/git-api";

interface RepositoryCardProps {
  repository: Repository;
  onClick?: () => void;
  onDelete?: (id: string) => void;
}

export function RepositoryCard({ repository, onClick, onDelete }: RepositoryCardProps) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col gap-3 rounded-lg border border-content-border bg-content-bg p-4 transition-colors ${
        onClick ? "cursor-pointer hover:border-accent-blue" : ""
      }`}
    >
      <div className="flex items-start justify-between">
        <h4 className="m-0 text-base font-semibold text-content-text">{repository.name}</h4>
        {onDelete ? (
          <Button
            size="sm"
            variant="destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(repository.id);
            }}
          >
            Delete
          </Button>
        ) : null}
      </div>

      {repository.localPath ? (
        <div className="text-sm text-content-text-secondary">
          <span className="mr-1 font-medium">Path:</span>
          {repository.localPath}
        </div>
      ) : null}

      {repository.remoteUrl ? (
        <div className="text-sm text-content-text-secondary">
          <span className="mr-1 font-medium">Remote:</span>
          {repository.remoteUrl}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {repository.defaultBranch ? <StatusPill tone="info">🌿 {repository.defaultBranch}</StatusPill> : null}
        {repository.provider ? <StatusPill tone="success">🔌 {repository.provider}</StatusPill> : null}
        {repository.role ? <StatusPill>👤 {repository.role}</StatusPill> : null}
      </div>

      <div className="text-xs text-content-text-tertiary">
        Updated: {new Date(repository.updatedAt).toLocaleDateString()}
      </div>
    </div>
  );
}
