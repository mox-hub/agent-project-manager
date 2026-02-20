import { type IntegrationConfig } from '../api/integration-api';

interface IntegrationCardProps {
  integration: IntegrationConfig;
  onConfigure?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggle?: (id: string, enabled: boolean) => void;
}

export function IntegrationCard({
  integration,
  onConfigure,
  onDelete,
  onToggle,
}: IntegrationCardProps) {
  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'connected':
        return '#10b981';
      case 'error':
        return '#ef4444';
      case 'pending':
        return '#f59e0b';
      default:
        return '#9ca3af';
    }
  };

  const getStatusText = (status?: string | null) => {
    switch (status) {
      case 'connected':
        return '✓ Connected';
      case 'error':
        return '✕ Error';
      case 'pending':
        return '⏳ Pending';
      default:
        return '• Inactive';
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'github':
        return '🐙';
      case 'gitlab':
        return '🦊';
      case 'bitbucket':
        return '🪣';
      case 'jira':
        return '🐞';
      case 'trello':
        return '📋';
      case 'notion':
        return '📝';
      case 'slack':
        return '💬';
      case 'discord':
        return '🎮';
      default:
        return '🔌';
    }
  };

  return (
    <div
      style={{
        padding: '16px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        backgroundColor: 'white',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>
            {getProviderIcon(integration.provider)}
          </span>
          <div>
            <h4 style={{ margin: 0, color: '#1f2937', fontWeight: '600', fontSize: '16px' }}>
              {integration.name}
            </h4>
            {integration.projectId && (
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Project: {integration.projectId}
              </p>
            )}
          </div>
        </div>
        <span
          style={{
            fontSize: '12px',
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: getStatusColor(integration.status),
            color: 'white',
            fontWeight: '500',
          }}
        >
          {getStatusText(integration.status)}
        </span>
      </div>

      {integration.errorMessage && (
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            fontSize: '13px',
            color: '#b91c1c',
          }}
        >
          ⚠️ {integration.errorMessage}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <span
          style={{
            fontSize: '12px',
            padding: '4px 8px',
            backgroundColor: integration.enabled ? '#d1fae5' : '#f3f4f6',
            color: integration.enabled ? '#065f46' : '#6b7280',
            borderRadius: '12px',
          }}
        >
          {integration.enabled ? '● Enabled' : '○ Disabled'}
        </span>
        {integration.lastSyncAt && (
          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
            Last sync: {new Date(integration.lastSyncAt).toLocaleString()}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px' }}>
        {onConfigure && (
          <button
            onClick={() => onConfigure(integration.id)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              flex: 1,
            }}
          >
            Configure
          </button>
        )}
        {onToggle && (
          <button
            onClick={() => onToggle(integration.id, !integration.enabled)}
            style={{
              padding: '6px 12px',
              backgroundColor: integration.enabled ? '#f59e0b' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              flex: 1,
            }}
          >
            {integration.enabled ? 'Disable' : 'Enable'}
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(integration.id)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              flex: 1,
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
