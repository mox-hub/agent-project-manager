import type { ReactNode } from 'react';
import { ArrowUpRight, CheckCircle2, CircleDashed, FileText, GitBranch, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface IntegrationStatusStripProps {
  repositoryCount: number;
  externalLinksCount: number;
  docLinksCount: number;
  apiDocLinksCount: number;
  onManage: () => void;
}

function IntegrationItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  const isReady = value !== '0';
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {label}
        </span>
        {isReady ? (
          <CheckCircle2 size={14} className="text-status-on-track" />
        ) : (
          <CircleDashed size={14} className="text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

export function IntegrationStatusStrip({
  repositoryCount,
  externalLinksCount,
  docLinksCount,
  apiDocLinksCount,
  onManage,
}: IntegrationStatusStripProps) {
  return (
    <Card className="border-border">
      <CardContent className="space-y-3 pt-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <IntegrationItem
            label="Repository Binding"
            value={String(repositoryCount)}
            icon={<GitBranch size={14} className="text-accent-blue" />}
          />
          <IntegrationItem
            label="External Sync"
            value={String(externalLinksCount)}
            icon={<Link2 size={14} className="text-accent-blue" />}
          />
          <IntegrationItem
            label="Docs Coverage"
            value={`${docLinksCount} / ${apiDocLinksCount}`}
            icon={<FileText size={14} className="text-accent-blue" />}
          />
        </div>
        <Button variant="ghost" className="w-full justify-between" onClick={onManage}>
          Manage Integrations
          <ArrowUpRight size={14} />
        </Button>
      </CardContent>
    </Card>
  );
}
