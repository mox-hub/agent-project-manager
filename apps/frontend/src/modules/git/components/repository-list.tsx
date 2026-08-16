import { useState } from "react";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateRepository, useRepositories } from "../hooks/use-repositories";
import { useProjectList } from "@/modules/project/hooks/use-project-list";
import { type CreateRepositoryDto } from "../api/git-api";

interface RepositoryListProps {
  projectId?: string;
  provider?: string;
  query?: string;
}

export function RepositoryList({ projectId: propProjectId, provider = "all", query = "" }: RepositoryListProps) {
  const { data: projects } = useProjectList();
  const { data: repositories, isLoading } = useRepositories({
    projectId: propProjectId,
    provider: provider === "all" ? undefined : provider,
  });
  const createRepository = useCreateRepository();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateRepositoryDto>({
    projectId: propProjectId || "",
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
    setFormError(null);
    if (!formData.name) {
      setFormError("Name is required");
      return;
    }
    if (!propProjectId && !formData.projectId) {
      setFormError("Please select a project");
      return;
    }

    try {
      await createRepository.mutateAsync(formData);
      setShowCreateForm(false);
      setFormData({
        projectId: propProjectId || "",
        name: "",
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create repository";
      setFormError(errorMessage);
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
          {formError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          {!propProjectId && (
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Project</label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects?.items.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
