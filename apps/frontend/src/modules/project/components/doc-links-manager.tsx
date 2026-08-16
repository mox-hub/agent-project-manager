import { useState } from 'react';
import { useDocLinks, useAddDocLink, useDeleteDocLink } from '../hooks/use-project-links';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

const DOC_TYPE_OPTIONS = [
  { value: 'wiki', label: 'Wiki', icon: '📝' },
  { value: 'spec', label: 'Specification', icon: '📄' },
  { value: 'design', label: 'Design', icon: '🎨' },
  { value: 'other', label: 'Other', icon: '📁' },
];

interface DocLinksManagerProps {
  projectId: string;
}

export function DocLinksManager({ projectId }: DocLinksManagerProps) {
  const { data: links = [], isLoading } = useDocLinks(projectId);
  const addLink = useAddDocLink(projectId);
  const deleteLink = useDeleteDocLink(projectId);

  const [isAdding, setIsAdding] = useState(false);
  const [newLink, setNewLink] = useState({
    label: '',
    url: '',
    type: 'wiki' as const,
    description: '',
    aiIndexed: false,
  });

  const handleAdd = async () => {
    if (!newLink.label || !newLink.url) return;
    await addLink.mutateAsync(newLink);
    setNewLink({ label: '', url: '', type: 'wiki', description: '', aiIndexed: false });
    setIsAdding(false);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-base font-semibold m-0">External Documentation</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Link to Notion, Confluence, Google Docs, etc.
          </p>
        </div>
        <Button onClick={() => setIsAdding(true)} disabled={isAdding}>
          + Add Document
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
                  placeholder="Project Requirements"
                />
              </div>
              <div>
                <Label className="mb-1 block text-sm text-muted-foreground font-medium">Type</Label>
                <NativeSelect
                  className="w-full"
                  value={newLink.type}
                  onChange={(e) => setNewLink({ ...newLink, type: e.target.value as any })}
                >
                  {DOC_TYPE_OPTIONS.map((opt) => (
                    <NativeSelectOption key={opt.value} value={opt.value}>
                      {opt.icon} {opt.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div>
              <Label className="mb-1 block text-sm text-muted-foreground font-medium">URL</Label>
              <Input
                type="url"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://..."
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
              <Checkbox
                id="aiIndexed"
                checked={newLink.aiIndexed}
                onChange={(e) => setNewLink({ ...newLink, aiIndexed: e.target.checked })}
              />
              <Label htmlFor="aiIndexed" className="text-sm text-muted-foreground">
                Index for AI context (make available to AI assistant)
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
          No external documents linked yet.
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
                  {DOC_TYPE_OPTIONS.find((t) => t.value === link.type)?.icon || '📁'}
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
                <Button variant="destructive" size="sm" onClick={() => deleteLink.mutate(link.id)} disabled={deleteLink.isPending}>
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
