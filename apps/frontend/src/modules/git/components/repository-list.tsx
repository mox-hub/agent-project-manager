import { useState } from "react";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { useCreateRepository, useRepositories } from "../hooks/use-repositories";
import { type CreateRepositoryDto } from "../api/git-api";

interface RepositoryListProps {
  projectId?: string;
}

export function RepositoryList({ projectId }: RepositoryListProps) {
  const { data: repositories, isLoading } = useRepositories({ projectId });
  const createRepository = useCreateRepository();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateRepositoryDto>({
    projectId: projectId || "",
    name: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId || !formData.name) return;

    try {
      await createRepository.mutateAsync(formData);
      setShowCreateForm(false);
      setFormData({
        projectId: projectId || "",
        name: "",
      });
    } catch (error) {
      console.error("Failed to create repository", error);
    }
  };

  return (
    <SectionCard
      title="Repositories"
      actions={
        <Button size="sm" onClick={() => setShowCreateForm(true)}>
          Add Repository
        </Button>
      }
      contentClassName="space-y-4"
    >
      {showCreateForm ? (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-content-border p-4">
          <div className="space-y-1">
            <label className="text-xs text-content-text-secondary">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-content-text-secondary">Local Path</label>
            <Input
              value={formData.localPath || ""}
              onChange={(e) => setFormData({ ...formData, localPath: e.target.value })}
              placeholder="E:/code/app"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-content-text-secondary">Remote URL</label>
            <Input
              value={formData.remoteUrl || ""}
              onChange={(e) => setFormData({ ...formData, remoteUrl: e.target.value })}
              placeholder="git@github.com:user/repo.git"
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createRepository.isPending}>
              Create
            </Button>
            <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <AsyncState isLoading={isLoading} isEmpty={!repositories || repositories.length === 0} emptyTitle="No repositories found">
        <DataTableShell>
          <div className="divide-y divide-content-border">
            {repositories?.map((repo) => (
              <div key={repo.id} className="space-y-1 p-3 text-sm">
                <div className="font-medium text-content-text">{repo.name}</div>
                {repo.localPath ? <div className="text-content-text-secondary">{repo.localPath}</div> : null}
                {repo.remoteUrl ? <div className="text-content-text-secondary">{repo.remoteUrl}</div> : null}
                {repo.defaultBranch ? <div className="text-content-text-tertiary">Branch: {repo.defaultBranch}</div> : null}
              </div>
            ))}
          </div>
        </DataTableShell>
      </AsyncState>
    </SectionCard>
  );
}
