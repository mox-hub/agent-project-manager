import { useState } from 'react';
import { useExternalLinks, useAddExternalLink, useDeleteExternalLink } from '../hooks/use-project-links';
import { Card } from '@/components/ui/card';
import { PillButton } from '@/components/ui/button';
import { colors, spacing, typography } from '@/shared/theme/tokens';

const PROVIDER_OPTIONS = [
  { value: 'github_projects', label: 'GitHub Projects', icon: '🐙' },
  { value: 'linear', label: 'Linear', icon: '📋' },
  { value: 'jira', label: 'Jira', icon: '📊' },
];

interface ExternalLinksManagerProps {
  projectId: string;
}

export function ExternalLinksManager({ projectId }: ExternalLinksManagerProps) {
  const { data: links = [], isLoading } = useExternalLinks(projectId);
  const addLink = useAddExternalLink(projectId);
  const deleteLink = useDeleteExternalLink(projectId);

  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState({
    provider: 'github_projects' as const,
    externalProjectId: '',
    externalProjectUrl: '',
  });

  const handleAdd = async () => {
    if (!newLink.externalProjectId || !newLink.externalProjectUrl) return;
    await addLink.mutateAsync(newLink);
    setNewLink({ provider: 'github_projects', externalProjectId: '', externalProjectUrl: '' });
    setIsAdding(false);
  };

  if (isLoading) {
    return <div style={{ color: colors.textSecondary }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.md, fontWeight: 600 }}>Cloud Project Links</h3>
          <p style={{ margin: '4px 0 0', fontSize: typography.sm, color: colors.textSecondary }}>
            Sync with GitHub Projects, Linear, or Jira
          </p>
        </div>
        <PillButton variant="primary" onClick={() => setIsAdding(true)} disabled={isAdding}>
          + Add Link
        </PillButton>
      </div>

      {isAdding && (
        <Card style={{ marginBottom: spacing.md, backgroundColor: colors.surfaceAlt }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div>
              <label style={{ ...labelStyle }}>Provider</label>
              <select
                value={newLink.provider}
                onChange={(e) => setNewLink({ ...newLink, provider: e.target.value as any })}
                style={inputStyle}
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ ...labelStyle }}>External Project ID</label>
              <input
                type="text"
                value={newLink.externalProjectId}
                onChange={(e) => setNewLink({ ...newLink, externalProjectId: e.target.value })}
                placeholder="e.g., PVT-123"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ ...labelStyle }}>External Project URL</label>
              <input
                type="url"
                value={newLink.externalProjectUrl}
                onChange={(e) => setNewLink({ ...newLink, externalProjectUrl: e.target.value })}
                placeholder="https://github.com/users/xxx/projects/1"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: spacing.sm, justifyContent: 'flex-end' }}>
              <PillButton variant="secondary" onClick={() => setIsAdding(false)}>
                Cancel
              </PillButton>
              <PillButton variant="primary" onClick={handleAdd} disabled={addLink.isPending}>
                {addLink.isPending ? 'Adding...' : 'Add'}
              </PillButton>
            </div>
          </div>
        </Card>
      )}

      {links.length === 0 && !isAdding ? (
        <div style={{ textAlign: 'center', padding: spacing.xl, color: colors.textSecondary }}>
          No external project links configured yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          {links.map((link) => (
            <div
              key={link.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: spacing.md,
                backgroundColor: colors.surfaceAlt,
                borderRadius: 8,
                border: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
                <span style={{ fontSize: '20px' }}>
                  {PROVIDER_OPTIONS.find((p) => p.value === link.provider)?.icon || '📁'}
                </span>
                <div>
                  <div style={{ fontWeight: 500 }}>{link.provider.replace('_', ' ')}</div>
                  <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
                    {link.externalProjectId}
                  </div>
                  <a
                    href={link.externalProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: typography.sm, color: colors.primary }}
                  >
                    Open ↗
                  </a>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: typography.xs,
                    backgroundColor:
                      link.syncStatus === 'active'
                        ? colors.success + '20'
                        : link.syncStatus === 'error'
                        ? colors.error + '20'
                        : colors.textSecondary + '20',
                    color:
                      link.syncStatus === 'active'
                        ? colors.success
                        : link.syncStatus === 'error'
                        ? colors.error
                        : colors.textSecondary,
                  }}
                >
                  {link.syncStatus}
                </span>
                <PillButton
                  variant="danger"
                  size="sm"
                  onClick={() => deleteLink.mutate(link.id)}
                  disabled={deleteLink.isPending}
                >
                  Remove
                </PillButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: spacing.xs,
  fontSize: typography.sm,
  color: colors.textSecondary,
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderRadius: 6,
  border: `1px solid ${colors.borderStrong}`,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontSize: typography.sm,
  fontFamily: 'inherit',
};
