import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { type IntegrationConfig } from "../api/integration-api";

interface IntegrationCardProps {
  integration: IntegrationConfig;
  onConfigure?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, enabled: boolean) => void;
}

function getStatusTone(status?: string | null) {
  if (status === "connected") return "success";
  if (status === "error") return "danger";
  if (status === "pending") return "warning";
  return "default";
}

function getProviderIcon(provider: string) {
  const key = provider.toLowerCase();
  if (key === "github") return "🐙";
  if (key === "gitlab") return "🦊";
  if (key === "bitbucket") return "🪣";
  if (key === "jira") return "🐞";
  if (key === "trello") return "📋";
  if (key === "notion") return "📝";
  if (key === "slack") return "💬";
  if (key === "discord") return "🎮";
  return "🔌";
}

export function IntegrationCard({ integration, onConfigure, onDelete, onToggle }: IntegrationCardProps) {
  return (
    <div className="space-y-3 rounded-lg border border-content-border bg-content-bg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getProviderIcon(integration.provider)}</span>
          <div>
            <h4 className="text-base font-semibold text-content-text">{integration.name}</h4>
            {integration.projectId ? <p className="text-xs text-content-text-secondary">Project: {integration.projectId}</p> : null}
          </div>
        </div>
        <StatusPill tone={getStatusTone(integration.status)}>
          {integration.status || "inactive"}
        </StatusPill>
      </div>

      {integration.errorMessage ? (
        <div className="rounded-md border border-accent-red bg-accent-red-light p-2 text-xs text-accent-red">
          ⚠ {integration.errorMessage}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <StatusPill tone={integration.enabled ? "success" : "default"}>
          {integration.enabled ? "Enabled" : "Disabled"}
        </StatusPill>
        {integration.lastSyncAt ? (
          <span className="text-xs text-content-text-tertiary">
            Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
          </span>
        ) : null}
      </div>

      <div className="flex gap-2">
        {onConfigure ? (
          <Button className="flex-1" onClick={() => onConfigure(integration.id)}>
            Configure
          </Button>
        ) : null}
        {onToggle ? (
          <Button
            className="flex-1"
            variant={integration.enabled ? "secondary" : "default"}
            onClick={() => onToggle(integration.id, !integration.enabled)}
          >
            {integration.enabled ? "Disable" : "Enable"}
          </Button>
        ) : null}
        {onDelete ? (
          <Button className="flex-1" variant="destructive" onClick={() => onDelete(integration.id)}>
            Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}
