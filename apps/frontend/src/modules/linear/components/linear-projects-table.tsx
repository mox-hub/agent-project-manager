import * as React from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AsyncState } from '@/components/ui/async-state';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { LinearIcon } from '@/components/icons/linear';
import {
  useLinearRemoteProjects,
  useSyncProject,
} from '../hooks/use-linear-sync';
import type { LinearRemoteProject } from '../api/linear-api';

interface LinearProjectsTableProps {
  integrationId: string;
  open: boolean;
  onClose: () => void;
  targetLocalProjectId?: string;
  onSynced?: (projectId: string) => void;
}

export function LinearProjectsTable({
  integrationId,
  open,
  onClose,
  targetLocalProjectId,
  onSynced,
}: LinearProjectsTableProps) {
  const { data, isLoading, error } = useLinearRemoteProjects(
    open ? integrationId : null,
  );
  const [selected, setSelected] = useState<string | null>(null);
  const syncProject = useSyncProject();

  const submit = async () => {
    if (!selected) return;
    const result = await syncProject.mutateAsync({
      integrationId,
      linearProjectId: selected,
      targetLocalProjectId,
    });
    onSynced?.(result.projectId);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent keepDefaultWidth={false} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinearIcon size={20} /> Choose a Linear project
          </DialogTitle>
          <DialogDescription>
            {targetLocalProjectId
              ? 'Pull the latest fields from a Linear project into this project. Local-only fields (members, progress, AI context) are preserved.'
              : 'Pick a project to import. A new local project will be created (read-only fields will be locked to Linear).'}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border">
          <AsyncState
            isLoading={isLoading}
            error={error ? (error instanceof Error ? error.message : 'Unknown error') : null}
            isEmpty={!data || data.length === 0}
            loadingFallback={
              <div className="space-y-2 p-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            }
            emptyTitle="No projects visible"
            emptyDescription="Check that this API key can see at least one Linear project."
          >
            <ul className="divide-y">
              {data.map((proj) => (
                <ProjectRow
                  key={proj.id}
                  project={proj}
                  selected={selected === proj.id}
                  onSelect={() => setSelected(proj.id)}
                />
              ))}
            </ul>
          </AsyncState>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!selected || syncProject.isPending}
          >
            {syncProject.isPending ? 'Syncing…' : 'Sync to local project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProjectRow({
  project,
  selected,
  onSelect,
}: {
  project: LinearRemoteProject;
  selected: boolean;
  onSelect: () => void;
}) {
  const teams = project.teams ?? [];
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left transition-colors hover:bg-muted/40 ${
          selected ? 'bg-muted/60' : ''
        }`}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
            style={{
              background: project.color ?? 'var(--color-brand-linear)',
            }}
          >
            {project.icon ?? project.name.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate font-medium">{project.name}</h4>
              {project.state ? (
                <Badge variant="secondary" className="text-3xs">
                  {project.state}
                </Badge>
              ) : null}
            </div>
            {project.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {project.description}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-2xs text-muted-foreground">
              {teams.map((t) => (
                <span
                  key={t.id}
                  className="rounded-sm bg-muted/60 px-1.5 py-0.5 font-mono"
                >
                  {t.key}
                </span>
              ))}
            </div>
          </div>
          <div
            className={`size-4 shrink-0 rounded-full border-2 transition-colors ${
              selected ? 'border-brand-linear bg-brand-linear' : 'border-muted-foreground/40'
            }`}
          />
        </div>
      </button>
    </li>
  );
}
