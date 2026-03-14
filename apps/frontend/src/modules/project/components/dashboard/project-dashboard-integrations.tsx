import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileText, GitBranch } from 'lucide-react';

function ConnectedBadge() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-green-light text-accent-green">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
      </svg>
    </div>
  );
}

export function ProjectDashboardIntegrations() {
  return (
    <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="flex items-center gap-3 p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-content-bg-secondary">
          <GitBranch size={24} />
        </div>
        <div className="flex-1">
          <h4 className="mb-0 text-sm font-bold text-content-text">Repository Binding</h4>
          <p className="mb-0 text-xs text-content-text-secondary">nebula-core/cloud-infra</p>
        </div>
        <ConnectedBadge />
      </Card>

      <Card className="flex items-center gap-3 p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-content-bg-secondary">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--color-accent-blue)">
            <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="mb-0 text-sm font-bold text-content-text">Linear Sync</h4>
          <p className="mb-0 text-xs text-content-text-secondary">Project: NC-2024</p>
        </div>
        <ConnectedBadge />
      </Card>

      <Card className="flex items-center gap-3 p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-content-bg-secondary text-accent-blue">
          <FileText size={24} />
        </div>
        <div className="flex-1">
          <h4 className="mb-0 text-sm font-bold text-content-text">External Docs</h4>
          <p className="mb-0 text-xs text-content-text-secondary">Notion / Google Drive</p>
        </div>
        <Button variant="ghost" size="sm" className="text-accent-blue">
          Manage
        </Button>
      </Card>
    </section>
  );
}
