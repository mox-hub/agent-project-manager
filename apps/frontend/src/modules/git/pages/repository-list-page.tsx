import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { RepositoryCard } from "../components/repository-card";
import { RepositoryList } from "../components/repository-list";
import { useRepositories } from "../hooks/use-repositories";

export function RepositoryListPage() {
  const { data: repositories, isLoading } = useRepositories();
  const repositoryList = repositories ?? [];

  return (
    <PageShell className="overflow-auto">
      <PageHeader title="Git Repositories" />
      <div className="mx-auto w-full max-w-[1200px] space-y-6 p-6">
        <RepositoryList />

        {repositoryList.length > 0 ? (
          <section>
            <h2 className="mb-4 text-xl font-semibold text-content-text">All Repositories ({repositoryList.length})</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {repositoryList.map((repo) => (
                <RepositoryCard
                  key={repo.id}
                  repository={repo}
                  onClick={() => {
                    console.log("Navigate to repository:", repo.id);
                  }}
                />
              ))}
            </div>
          </section>
        ) : !isLoading ? (
          <EmptyState
            title="No repositories yet"
            description="Add your first Git repository to start tracking your code."
          />
        ) : null}
      </div>
    </PageShell>
  );
}
