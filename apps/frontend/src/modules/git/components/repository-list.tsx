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
  provider?: string;
  query?: string;
}

export function RepositoryList({ projectId, provider = "all", query = "" }: RepositoryListProps) {
  const { data: repositories, isLoading } = useRepositories({
    projectId,
    provider: provider === "all" ? undefined : provider,
  });
  const createRepository = useCreateRepository();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<CreateRepositoryDto>({
    projectId: projectId || "",
    name: "",
  });
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRepositories = (repositories ?? []).filter((repo) => {
    if (!normalizedQuery) {
      return true;
    }
    const haystack = `${repo.name} ${repo.localPath ?? ""} ${repo.remoteUrl ?? ""} ${repo.defaultBranch ?? ""}`.toLowerCase();
    return haystack.includes(normalizedQuery);
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
        <Button
          size="sm"
          onClick={() => setShowCreateForm(true)}
          data-ai-component="git.repository-list.section.add-repository"
          data-ai-action="git.repository-list.section.add-repository.click"
          data-ai-role="submit"
        >
          Add Repository
        </Button>
      }
      contentClassName="space-y-4"
    >
      {showCreateForm ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-border bg-muted/50 p-4 motion-enter"
          data-ai-component="git.repository-list.create-form"
          data-ai-role="input"
        >
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              data-ai-component="git.repository-list.create-form.name"
              data-ai-action="git.repository-list.create-form.name.change"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Local Path</label>
            <Input
              value={formData.localPath || ""}
              onChange={(e) => setFormData({ ...formData, localPath: e.target.value })}
              placeholder="E:/code/app"
              data-ai-component="git.repository-list.create-form.local-path"
              data-ai-action="git.repository-list.create-form.local-path.change"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Remote URL</label>
            <Input
              value={formData.remoteUrl || ""}
              onChange={(e) => setFormData({ ...formData, remoteUrl: e.target.value })}
              placeholder="git@github.com:user/repo.git"
              data-ai-component="git.repository-list.create-form.remote-url"
              data-ai-action="git.repository-list.create-form.remote-url.change"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={createRepository.isPending}
              data-ai-component="git.repository-list.create-form.submit"
              data-ai-action="git.repository-list.create-form.submit.click"
              data-ai-role="submit"
            >
              Create
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateForm(false)}
              data-ai-component="git.repository-list.create-form.cancel"
              data-ai-action="git.repository-list.create-form.cancel.click"
              data-ai-role="jump"
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      <AsyncState isLoading={isLoading} isEmpty={filteredRepositories.length === 0} emptyTitle="No repositories found">
        <DataTableShell>
          <div className="divide-y divide-border">
            {filteredRepositories.map((repo) => (
              <div
                key={repo.id}
                className="space-y-1 p-3 text-sm motion-shift hover:bg-muted/50"
                data-ai-component={`git.repository-list.row.${repo.id}`}
                data-ai-role="content"
              >
                <div className="font-medium text-foreground">{repo.name}</div>
                {repo.localPath ? <div className="text-muted-foreground">{repo.localPath}</div> : null}
                {repo.remoteUrl ? <div className="text-muted-foreground">{repo.remoteUrl}</div> : null}
                {repo.defaultBranch ? <div className="text-muted-foreground">Branch: {repo.defaultBranch}</div> : null}
              </div>
            ))}
          </div>
        </DataTableShell>
      </AsyncState>
    </SectionCard>
  );
}
