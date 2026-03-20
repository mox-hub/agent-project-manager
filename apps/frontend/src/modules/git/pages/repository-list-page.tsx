import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { AttentionRail } from "@/components/ui/attention-rail";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { RepositoryCard } from "../components/repository-card";
import { RepositoryList } from "../components/repository-list";
import { useRepositories } from "../hooks/use-repositories";

export function RepositoryListPage() {
  const { data: repositories, isLoading } = useRepositories();
  const repositoryList = repositories ?? [];

  return (
    <PageShell className="overflow-auto" aiPage={CORE_AI_PAGE_IDS.repositoryList}>
      <PageHeader
        aiId="git.repository-list"
        title="Git Repositories"
        description="统一查看仓库状态、分支上下文与连接质量。"
      />
      <div className="mx-auto grid w-full max-w-[1280px] gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="motion-enter" data-ai-component="git.repository-list.context-bar" data-ai-role="filter">
            <RepositoryList />
          </div>

          {repositoryList.length > 0 ? (
            <section data-ai-component="git.repository-list.primary-content" data-ai-role="content">
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

        <AttentionRail
          aiPrefix="git.repository-list"
          items={[
            {
              id: 'terminal',
              title: '打开终端会话',
              description: '在终端中执行 Git 与排障命令',
              to: '/app/terminal',
            },
            {
              id: 'integration',
              title: '查看外部集成',
              description: '确认代码托管服务连接状态',
              to: '/app/integrations',
            },
          ]}
        />
      </div>
    </PageShell>
  );
}
