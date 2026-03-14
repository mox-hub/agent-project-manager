import { useState } from 'react';
import { useExternalLinks, useAddExternalLink, useDeleteExternalLink } from '../hooks/use-project-links';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-semibold m-0">Cloud Project Links</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Sync with GitHub Projects, Linear, or Jira
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          + Add Link
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-4 bg-muted/50">
          <CardContent className="flex flex-col gap-4 pt-4">
            <div>
              <Label className="mb-1 block text-sm text-muted-foreground font-medium">Provider</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newLink.provider}
                onChange={(e) => setNewLink({ ...newLink, provider: e.target.value as any })}
              >
                {PROVIDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.icon} {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="mb-1 block text-sm text-muted-foreground font-medium">External Project ID</Label>
              <Input
                type="text"
                value={newLink.externalProjectId}
                onChange={(e) => setNewLink({ ...newLink, externalProjectId: e.target.value })}
                placeholder="e.g., PVT-123"
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm text-muted-foreground font-medium">External Project URL</Label>
              <Input
                type="url"
                value={newLink.externalProjectUrl}
                onChange={(e) => setNewLink({ ...newLink, externalProjectUrl: e.target.value })}
                placeholder="https://github.com/users/xxx/projects/1"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setIsAdding(false)}>
                Cancel
              </Button>
              <Button onClick={handleAdd} disabled={addLink.isPending}>
                {addLink.isPending ? 'Adding...' : 'Add'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {links.length === 0 && !isAdding ? (
        <div className="text-center p-8 text-muted-foreground">
          No external project links configured yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border"
            >
              <div className="flex items-center gap-4">
                <span style={{ fontSize: '20px' }}>
                  {PROVIDER_OPTIONS.find((p) => p.value === link.provider)?.icon || '📁'}
                </span>
                <div>
                  <div className="font-medium">{link.provider.replace('_', ' ')}</div>
                  <div className="text-sm text-muted-foreground">
                    {link.externalProjectId}
                  </div>
                  <a
                    href={link.externalProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Open ↗
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    backgroundColor:
                      link.syncStatus === 'active'
                        ? 'hsl(var(--primary))20'
                        : link.syncStatus === 'error'
                        ? 'hsl(var(--destructive))20'
                        : 'hsl(var(--muted))20',
                    color:
                      link.syncStatus === 'active'
                        ? 'hsl(var(--primary))'
                        : link.syncStatus === 'error'
                        ? 'hsl(var(--destructive))'
                        : 'hsl(var(--muted-foreground))',
                  }}
                >
                  {link.syncStatus}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLink.mutate(link.id)}
                  disabled={deleteLink.isPending}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
