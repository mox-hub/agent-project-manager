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

export function IntegrationListPage() {
  const confirmAction = useConfirm();
  const { data: integrationsData, isLoading } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);

  const integrations = integrationsData?.data || [];

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
    <PageShell className="overflow-auto" aiPage={CORE_AI_PAGE_IDS.integrationList}>
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
      <div className="mx-auto grid w-full max-w-[1280px] gap-4 p-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="motion-enter" data-ai-component="integration.integration-list.context-bar" data-ai-role="filter">
            <IntegrationList />
          </div>

          {integrations.length > 0 ? (
            <section data-ai-component="integration.integration-list.primary-content" data-ai-role="content">
              <h2 className="mb-4 text-xl font-semibold text-content-text">All Integrations ({integrations.length})</h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {integrations.map((integration) => (
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

