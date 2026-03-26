import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AttentionRail } from "@/components/ui/attention-rail";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { CORE_AI_PAGE_IDS } from "@/shared/ai/identifiers";
import { useConfirm } from "@/shared/confirm/use-confirm";
import { IntegrationCard } from "../components/integration-card";
import { IntegrationConfigForm } from "../components/integration-config-form";
import { IntegrationList } from "../components/integration-list";
import { useDeleteIntegration, useIntegrations } from "../hooks/use-integrations";
import { type IntegrationConfig } from "../api/integration-api";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";

export function IntegrationListPage() {
  const confirmAction = useConfirm();
  const { data: integrationsData, isLoading } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [providerFilter, setProviderFilter] = useState('all');
  const [enabledFilter, setEnabledFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [query, setQuery] = useState('');

  const integrations = integrationsData?.data || [];
  const providerOptions = Array.from(new Set(integrations.map((integration) => integration.provider))).filter(Boolean);
  const filteredIntegrations = integrations.filter((integration) => {
    if (providerFilter !== 'all' && integration.provider !== providerFilter) return false;
    if (enabledFilter === 'enabled' && !integration.enabled) return false;
    if (enabledFilter === 'disabled' && integration.enabled) return false;
    if (query.trim()) {
      const haystack = `${integration.name} ${integration.provider}`.toLowerCase();
      if (!haystack.includes(query.trim().toLowerCase())) return false;
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    const ok = await confirmAction({
      title: "删除集成",
      description: "确定要删除该集成吗？",
      confirmText: "删除",
      cancelText: "取消",
      variant: "destructive",
    });
    if (ok) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  return (
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.integrationList}>
      <PageHeader
        aiId="integration.integration-list"
        title="Integrations"
        description="统一管理外部系统连接、配置状态与集成生命周期。"
        actions={(
          <Button
            data-ai-component="integration.integration-list.header.add"
            data-ai-action="integration.integration-list.header.add.click"
            data-ai-role="submit"
          >
            + Add Integration
          </Button>
        )}
      />
      <section
        className="border-b border-content-border bg-content-bg px-6 py-2.5"
        data-ai-component="integration.integration-list.context-bar.filters"
        data-ai-role="filter"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search integrations..."
            className="h-8 w-[220px]"
            data-ai-component="integration.integration-list.context-bar.search"
            data-ai-action="integration.integration-list.context-bar.search.change"
            data-ai-role="input"
          />
          <NativeSelect
            value={providerFilter}
            onChange={(event) => setProviderFilter(event.target.value)}
            className="h-8 w-[170px]"
            data-ai-component="integration.integration-list.context-bar.provider"
            data-ai-action="integration.integration-list.context-bar.provider.change"
            data-ai-role="select"
          >
            <NativeSelectOption value="all">All providers</NativeSelectOption>
            {providerOptions.map((provider) => (
              <NativeSelectOption key={provider} value={provider}>
                {provider}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            value={enabledFilter}
            onChange={(event) => setEnabledFilter(event.target.value as 'all' | 'enabled' | 'disabled')}
            className="h-8 w-[150px]"
            data-ai-component="integration.integration-list.context-bar.enabled"
            data-ai-action="integration.integration-list.context-bar.enabled.change"
            data-ai-role="select"
          >
            <NativeSelectOption value="all">All status</NativeSelectOption>
            <NativeSelectOption value="enabled">Enabled</NativeSelectOption>
            <NativeSelectOption value="disabled">Disabled</NativeSelectOption>
          </NativeSelect>
        </div>
      </section>
      <div className="mx-auto grid h-full w-full max-w-[1280px] gap-4 overflow-hidden p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="motion-enter" data-ai-component="integration.integration-list.context-bar" data-ai-role="filter">
            <IntegrationList provider={providerFilter} enabled={enabledFilter} query={query} />
          </div>

          {filteredIntegrations.length > 0 ? (
            <section data-ai-component="integration.integration-list.primary-content" data-ai-role="content">
              <h2 className="mb-4 text-base font-semibold text-content-text">All Integrations ({filteredIntegrations.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredIntegrations.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    onConfigure={() => setSelectedIntegration(integration)}
                    onDelete={handleDelete}
                    onToggle={(id, enabled) => {
                      console.log("Toggle integration:", id, enabled);
                    }}
                  />
                ))}
              </div>
            </section>
          ) : !isLoading ? (
            <EmptyState
              title="No integrations configured"
              description="Connect your tools and services to automate your workflows."
            />
          ) : null}
        </div>

        <AttentionRail
          aiPrefix="integration.integration-list"
          items={[
            {
              id: 'settings',
              title: '回到全局设置',
              description: '统一调整默认策略与系统配置',
              to: '/app/settings',
            },
            {
              id: 'projects',
              title: '打开项目工作台',
              description: '查看集成对项目执行的影响',
              to: '/app/projects',
            },
          ]}
        />

        {selectedIntegration ? (
          <IntegrationConfigForm
            integration={selectedIntegration}
            onClose={() => setSelectedIntegration(null)}
          />
        ) : null}
      </div>
    </PageShell>
  );
}

