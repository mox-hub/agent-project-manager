import { useState } from 'react';
import { IntegrationList } from '../components/integration-list';
import { IntegrationCard } from '../components/integration-card';
import { IntegrationConfigForm } from '../components/integration-config-form';
import { useIntegrations, useDeleteIntegration } from '../hooks/use-integrations';
import { type IntegrationConfig } from '../api/integration-api';

export function IntegrationListPage() {
  const { data: integrationsData, isLoading } = useIntegrations();
  const deleteIntegration = useDeleteIntegration();
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationConfig | null>(null);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);

  const integrations = integrationsData?.data || [];

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this integration?')) {
      await deleteIntegration.mutateAsync(id);
    }
  };

  const handleCloseCreateForm = () => setIsCreateFormOpen(false);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1f2937' }}>
            Integrations
          </h1>
          <button
            onClick={() => setIsCreateFormOpen(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            + Add Integration
          </button>
        </div>

        <IntegrationList />

        {integrations.length > 0 ? (
          <div>
            <h2 style={{ marginBottom: '16px', fontSize: '20px', color: '#374151' }}>
              All Integrations ({integrations.length})
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '16px' }}>
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConfigure={(id) => setSelectedIntegration(integration)}
                  onDelete={handleDelete}
                  onToggle={(id, enabled) => {
                    console.log('Toggle integration:', id, enabled);
                    // Implement toggle functionality
                  }}
                />
              ))}
            </div>
          </div>
        ) : (
          !isLoading && (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 24px',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                backgroundColor: 'white',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔌</div>
              <h3 style={{ fontSize: '20px', color: '#6b7280', marginBottom: '8px' }}>
                No integrations configured
              </h3>
              <p style={{ fontSize: '14px', color: '#9ca3af' }}>
                Connect your tools and services to automate your workflows
              </p>
            </div>
          )
        )}

        {/* Configuration Modal */}
        {selectedIntegration && (
          <IntegrationConfigForm
            integration={selectedIntegration}
            onClose={() => setSelectedIntegration(null)}
          />
        )}
      </div>
    </div>
  );
}
