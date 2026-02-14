import { useState } from 'react';
import { useIntegrations, useDeleteIntegration } from '../hooks/use-integrations';

export function IntegrationList({ projectId }: { projectId?: string }) {
  const { data, isLoading } = useIntegrations({ projectId });
  const deleteIntegration = useDeleteIntegration();
  const [, setSelectedProvider] = useState<string | null>(null);

  const integrations = data?.data || [];

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this integration?')) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  const getStatusColor = (status?: string | null) => {
    switch (status) {
      case 'connected':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#e5e7eb' }}>
          Integrations
        </h2>
        <button
          type="button"
          onClick={() => setSelectedProvider('new')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #1f2937',
            backgroundColor: '#111827',
            color: '#e5e7eb',
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          + Add Integration
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>
          Loading...
        </div>
      ) : integrations.length === 0 ? (
        <div
          style={{
            padding: '32px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '12px',
            border: '1px dashed #1f2937',
            borderRadius: '8px',
          }}
        >
          No integrations configured
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {integrations.map((integration) => (
            <div
              key={integration.id}
              style={{
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #111827',
                backgroundColor: '#020617',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>
                    {integration.name}
                  </span>
                  <span
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#111827',
                      color: '#9ca3af',
                      fontSize: '11px',
                    }}
                  >
                    {integration.provider}
                  </span>
                  {integration.scope === 'project' && (
                    <span
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        backgroundColor: '#1e3a8a',
                        color: '#93c5fd',
                        fontSize: '11px',
                      }}
                    >
                      Project
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: '#9ca3af',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: getStatusColor(integration.status),
                    }}
                  />
                  <span>
                    {integration.status || 'disconnected'}
                    {integration.errorMessage && ` - ${integration.errorMessage}`}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedProvider(integration.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #1f2937',
                    backgroundColor: '#111827',
                    color: '#9ca3af',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(integration.id)}
                  disabled={deleteIntegration.isPending}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #1f2937',
                    backgroundColor: '#111827',
                    color: '#ef4444',
                    fontSize: '11px',
                    cursor: deleteIntegration.isPending ? 'not-allowed' : 'pointer',
                    opacity: deleteIntegration.isPending ? 0.6 : 1,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
