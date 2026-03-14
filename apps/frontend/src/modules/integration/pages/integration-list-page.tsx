import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageShell } from "@/components/ui/page-shell";
import { IntegrationCard } from "../components/integration-card";
import { IntegrationConfigForm } from "../components/integration-config-form";
import { IntegrationList } from "../components/integration-list";
import { useDeleteIntegration, useIntegrations } from "../hooks/use-integrations";
import { type IntegrationConfig } from "../api/integration-api";

export function IntegrationListPage() {
  const { data: integrationsData, isLoading } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);

  const integrations = integrationsData?.data || [];

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this integration?")) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  return (
    <PageShell className="overflow-auto">
      <PageHeader
        title="Integrations"
        actions={<Button>+ Add Integration</Button>}
      />
      <div className="mx-auto w-full max-w-[1200px] space-y-6 p-6">
        <IntegrationList />

        {integrations.length > 0 ? (
          <section>
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
