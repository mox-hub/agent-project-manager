import { useState } from 'react';
import { useApiDocLinks, useAddApiDocLink, useDeleteApiDocLink } from '../hooks/use-project-links';
import { Card } from '@/shared/ui/card';
import { PillButton } from '@/shared/ui/button';
import { colors, spacing, typography } from '@/shared/theme/tokens';

const API_DOC_TYPE_OPTIONS = [
  { value: 'openapi', label: 'OpenAPI/Swagger', icon: '🔵' },
  { value: 'apifox', label: 'Apifox', icon: '🟠' },
  { value: 'postman', label: 'Postman', icon: '🟡' },
  { value: 'other', label: 'Other', icon: '📁' },
];

interface ApiDocLinksManagerProps {
  projectId: string;
}

export function ApiDocLinksManager({ projectId }: ApiDocLinksManagerProps) {
  const { data: links = [], isLoading } = useApiDocLinks(projectId);
  const addLink = useAddApiDocLink(projectId);
  const deleteLink = useDeleteApiDocLink(projectId);

  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState({
    label: '',
    url: '',
    type: 'openapi' as const,
    description: '',
    aiIndexed: false,
  });

  const handleAdd = async () => {
    if (!newLink.label || !newLink.url) return;
    await addLink.mutateAsync(newLink);
    setNewLink({ label: '', url: '', type: 'openapi', description: '', aiIndexed: false });
    setIsAdding(false);
  };

  if (isLoading) {
    return <div style={{ color: colors.textSecondary }}>Loading...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <div>
          <h3 style={{ margin: 0, fontSize: typography.md, fontWeight: 600 }}>API Documentation</h3>
          <p style={{ margin: '4px 0 0', fontSize: typography.sm, color: colors.textSecondary }}>
            Link to Swagger, Apifox, Postman, etc.
          </p>
        </div>
        <PillButton variant="primary" onClick={() => setIsAdding(true)} disabled={isAdding}>
          + Add API Doc
        </PillButton>
      </div>

      {isAdding && (
        <Card style={{ marginBottom: spacing.md, backgroundColor: colors.surfaceAlt }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: spacing.md }}>
              <div>
                <label style={labelStyle}>Label</label>
                <input
                  type="text"
                  value={newLink.label}
                  onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                  placeholder="User API"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  value={newLink.type}
                  onChange={(e) => setNewLink({ ...newLink, type: e.target.value as any })}
                  style={inputStyle}
                >
                  {API_DOC_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>URL</label>
              <input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://api.example.com/docs"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Description (optional)</label>
              <input
                type="text"
                value={newLink.description}
                onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                placeholder="Brief description..."
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: spacing.md }}>
              <input
                type="checkbox"
                id="apiAiIndexed"
                checked={newLink.aiIndexed}
                onChange={(e) => setNewLink({ ...newLink, aiIndexed: e.target.checked })}
              />
              <label htmlFor="apiAiIndexed" style={{ fontSize: typography.sm, color: colors.textSecondary }}>
                Index for AI context
              </label>
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
          No API documentation linked yet.
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
                  {API_DOC_TYPE_OPTIONS.find((t) => t.value === link.type)?.icon || '📁'}
                </span>
                <div>
                  <div style={{ fontWeight: 500 }}>{link.label}</div>
                  <div style={{ fontSize: typography.sm, color: colors.textSecondary }}>
                    {link.description}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: typography.sm, color: colors.primary }}
                  >
                    Open ↗
                  </a>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
                {link.aiIndexed && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: typography.xs,
                      backgroundColor: colors.primary + '20',
                      color: colors.primary,
                    }}
                  >
                    AI Indexed
                  </span>
                )}
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
