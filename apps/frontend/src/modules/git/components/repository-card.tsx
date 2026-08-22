import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { type Repository } from '../api/git-api';
import {
  GitBranch,
  FolderGit2,
  Globe,
  Trash2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RepositoryCardProps {
  repository: Repository;
  onDelete?: (id: string) => void;
  onRefresh?: (id: string) => void;
}

export function RepositoryCard({ repository, onDelete, onRefresh }: RepositoryCardProps) {
  const navigate = useNavigate();
  const aiPrefix = `git.repository-list.card.${repository.id}`;

  const providerIcon = {
    github: '🐙',
    gitlab: '🦊',
    bitbucket: '🔵',
    local: '💻',
  }[repository.provider || 'local'] || '📦';

  return (
    <div
      onClick={() => navigate(`/app/repositories/${repository.id}`)}
      className="group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-gradient-to-br from-background to-muted/20 p-4 transition-all duration-200 hover:border-accent-blue/50 hover:shadow-lg hover:shadow-accent-blue/5 active:scale-99"
      data-ai-component={aiPrefix}
      data-ai-role="content"
    >
      {/* 顶部装饰线 */}
      <div className="absolute left-0 top-0 h-0.5 w-full bg-gradient-to-r from-accent-blue via-accent-purple to-accent-green opacity-0 transition-opacity group-hover:opacity-100" />

      {/* 主内容 */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* 仓库图标 */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 text-lg">
            {repository.provider === 'github' ? '🐙' : '📦'}
          </div>

          <div className="min-w-0 flex-1">
            <h4 className="truncate text-base font-semibold text-foreground">{repository.name}</h4>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {repository.project?.name || 'Unknown project'}
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onRefresh && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh(repository.id);
              }}
              className="h-7 w-7 rounded-full"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </Button>
          )}
          {onDelete && (
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(repository.id);
              }}
              className="h-7 w-7 rounded-full text-accent-red hover:bg-accent-red/10 hover:text-accent-red"
              title="Delete"
            >
              <Trash2 size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* 信息行 */}
      <div className="mt-3 space-y-2">
        {repository.localPath && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FolderGit2 size={12} className="shrink-0" />
            <span className="truncate font-mono">{repository.localPath}</span>
          </div>
        )}

        {repository.remoteUrl && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Globe size={12} className="shrink-0" />
            <span className="truncate">{repository.remoteUrl}</span>
          </div>
        )}
      </div>

      {/* 底部标签 */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {repository.defaultBranch && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-green/10 px-2 py-0.5 text-xs font-medium text-accent-green">
            <GitBranch size={10} />
            {repository.defaultBranch}
          </span>
        )}

        {repository.provider && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-purple/10 px-2 py-0.5 text-xs font-medium text-accent-purple">
            {providerIcon} {repository.provider}
          </span>
        )}

        {repository.role && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2 py-0.5 text-xs font-medium text-accent-blue capitalize">
            {repository.role === 'primary' ? '⭐' : '📌'} {repository.role}
          </span>
        )}
      </div>

      {/* 更新时间 */}
      <div className="mt-3 flex items-center justify-between text-10 text-muted-foreground/60">
        <span>Updated {new Date(repository.updatedAt).toLocaleDateString()}</span>
        <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </div>
    </div>
  );
}
