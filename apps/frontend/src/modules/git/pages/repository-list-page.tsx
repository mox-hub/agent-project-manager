import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { AttentionRail } from "@/components/ui/attention-rail";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { RepositoryCard } from "../components/repository-card";
import { RepositoryList } from "../components/repository-list";
import { useRepositories } from "../hooks/use-repositories";
import { useMemo, useState } from "react";

export function RepositoryListPage() {
  const { data: repositories, isLoading } = useRepositories();
  const repositoryList = useMemo(() => repositories ?? [], [repositories]);
  const [providerFilter, setProviderFilter] = useState("all");
  const [query, setQuery] = useState("");
  const providerOptions = useMemo(
    () =>
      Array.from(new Set(repositoryList.map((repository) => repository.provider).filter(Boolean) as string[])),
    [repositoryList],
  );
  const filteredRepositories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return repositoryList.filter((repository) => {
      if (providerFilter !== "all" && repository.provider !== providerFilter) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const haystack =
        `${repository.name} ${repository.localPath ?? ""} ${repository.remoteUrl ?? ""} ${repository.defaultBranch ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [providerFilter, query, repositoryList]);

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.repositoryList}>
      <PageHeader
        aiId="git.repository-list"
        title="Git Repositories"
        description="统一查看仓库状态、分支上下文与连接质量。"
      />
      <section
        className="border-b border-content-border bg-content-bg px-6 py-2.5"
        data-ai-component="git.repository-list.context-bar.filters"
        data-ai-role="filter"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search repositories..."
            className="h-8 w-[220px]"
            data-ai-component="git.repository-list.context-bar.search"
            data-ai-action="git.repository-list.context-bar.search.change"
            data-ai-role="input"
          />
          <NativeSelect
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
            className="h-8 w-[180px]"
            data-ai-component="git.repository-list.context-bar.provider"
            data-ai-action="git.repository-list.context-bar.provider.change"
            data-ai-role="select"
          >
            <NativeSelectOption value="all">All providers</NativeSelectOption>
            {providerOptions.map((provider) => (
              <NativeSelectOption key={provider} value={provider}>
                {provider}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </section>
      <div className="mx-auto grid h-full w-full max-w-[1280px] gap-4 overflow-hidden p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="motion-enter" data-ai-component="git.repository-list.context-bar" data-ai-role="filter">
            <RepositoryList provider={providerFilter} query={query} />
          </div>

          {filteredRepositories.length > 0 ? (
            <section data-ai-component="git.repository-list.primary-content" data-ai-role="content">
              <h2 className="mb-4 text-base font-semibold text-content-text">
                All Repositories ({filteredRepositories.length})
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredRepositories.map((repo) => (
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
