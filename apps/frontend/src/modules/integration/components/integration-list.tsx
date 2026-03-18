import { AsyncState } from "@/components/ui/async-state";
import { DataTableShell } from "@/components/ui/data-table-shell";
import { StatusPill } from "@/components/ui/status-pill";
import { useConfirm } from "@/shared/confirm/use-confirm";
import { useDeleteIntegration, useIntegrations } from "../hooks/use-integrations";

export function IntegrationList({ projectId }: { projectId?: string }) {
  const confirmAction = useConfirm();
  const { data, isLoading } = useIntegrations({ projectId });
  const deleteIntegration = useDeleteIntegration();
  const integrations = data?.data || [];

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
    <AsyncState isLoading={isLoading} isEmpty={integrations.length === 0} emptyTitle="No integrations configured">
      <DataTableShell>
        <div className="divide-y divide-content-border">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-center justify-between gap-3 p-3">
              <div>
                <div className="text-sm font-semibold text-content-text">{integration.name}</div>
                <div className="text-xs text-content-text-secondary">{integration.provider}</div>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill tone={integration.enabled ? "success" : "default"}>
                  {integration.enabled ? "Enabled" : "Disabled"}
                </StatusPill>
                <button
                  type="button"
                  onClick={() => handleDelete(integration.id)}
                  disabled={deleteIntegration.isPending}
                  className="rounded-md border border-content-border px-2 py-1 text-xs text-accent-red transition-colors hover:bg-content-bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </DataTableShell>
    </AsyncState>
  );
}

