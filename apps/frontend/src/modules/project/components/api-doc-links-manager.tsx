import { useState } from 'react';
import { useApiDocLinks, useAddApiDocLink, useDeleteApiDocLink } from '../hooks/use-project-links';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-semibold m-0">API Documentation</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Link to Swagger, Apifox, Postman, etc.
          </p>
        </div>
        <Button variant="default" onClick={() => setIsAdding(true)} disabled={isAdding}>
          + Add API Doc
        </Button>
      </div>

      {isAdding && (
        <Card className="mb-4 bg-muted/50">
          <CardContent className="flex flex-col gap-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block text-sm text-muted-foreground font-medium">Label</Label>
                <Input
                  type="text"
                  value={newLink.label}
                  onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                  placeholder="User API"
                />
              </div>
              <div>
                <Label className="mb-1 block text-sm text-muted-foreground font-medium">Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newLink.type}
                  onChange={(e) => setNewLink({ ...newLink, type: e.target.value as any })}
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
              <Label className="mb-1 block text-sm text-muted-foreground font-medium">URL</Label>
              <Input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://api.example.com/docs"
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm text-muted-foreground font-medium">Description (optional)</Label>
              <Input
                type="text"
                value={newLink.description}
                onChange={(e) => setNewLink({ ...newLink, description: e.target.value })}
                placeholder="Brief description..."
              />
            </div>
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                id="apiAiIndexed"
                checked={newLink.aiIndexed}
                onChange={(e) => setNewLink({ ...newLink, aiIndexed: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="apiAiIndexed" className="text-sm text-muted-foreground">
                Index for AI context
              </Label>
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
          No API documentation linked yet.
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
                  {API_DOC_TYPE_OPTIONS.find((t) => t.value === link.type)?.icon || '📁'}
                </span>
                <div>
                  <div className="font-medium">{link.label}</div>
                  <div className="text-sm text-muted-foreground">
                    {link.description}
                  </div>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    Open ↗
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {link.aiIndexed && (
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: 'hsl(var(--primary))20',
                      color: 'hsl(var(--primary))',
                    }}
                  >
                    AI Indexed
                  </span>
                )}
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
