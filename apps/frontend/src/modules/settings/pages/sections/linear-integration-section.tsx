/**
 * LinearIntegrationSection - 设置页「Linear 集成详情」子页
 * @description 由 linear 模块的 LinearIntegrationDetailPage 迁移而来
 * （原路由 /app/integrations/linear/:integrationId，2026-08-19 迁入设置页）
 */
import * as React from 'react';
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Power, PowerOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { useIntegration, useUpdateIntegration, useDeleteIntegration } from '@/modules/integration/hooks/use-integrations';
import { LinearIcon } from '@/components/icons/linear';
import { LinearProjectsTable } from '@/modules/linear/components/linear-projects-table';
import { LinearSyncLog } from '@/modules/linear/components/linear-sync-log';
import { LinearProviderCard } from '@/modules/linear/components/linear-provider-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfirm } from '@/shared/confirm/confirm-provider';

export function LinearIntegrationSection() {
  const params = useParams<{ integrationId: string }>();
  const integrationId = params.integrationId;
  const navigate = useNavigate();
  const { data, isLoading } = useIntegration(integrationId ?? '');
  const update = useUpdateIntegration();
  const remove = useDeleteIntegration();
  const [pickerOpen, setPickerOpen] = useState(false);
  const confirmDialog = useConfirm();

  if (isLoading) {
    return (
      <PageShell>
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </PageShell>
    );
  }
  if (!data) {
    return (
      <PageShell>
        <PageHeader
          title="Integration not found"
          actions={
            <HeaderActionButton
              variant="secondary"
              icon={ArrowLeft}
              label="Back"
              onClick={() => navigate(-1)}
            />
          }
        />
      </PageShell>
    );
  }

  const toggleEnabled = async () => {
    await update.mutateAsync({
      id: data.id,
      data: { enabled: !data.enabled },
    });
  };

  const handleDelete = async () => {
    const ok = await confirmDialog({
      title: '删除 Linear 集成',
      description:
        'Delete this Linear integration? Linked projects will lose sync but local data is preserved.',
      variant: 'destructive',
    });
    if (!ok) return;
    await remove.mutateAsync(data.id);
    navigate('/app/settings/integrations');
  };

  return (
    <PageShell>
      <SubPageToolbar
        aiId="integration.linear-detail"
        onBack={() => navigate('/app/settings/integrations')}
        breadcrumbs={[
          { label: 'Integrations', to: '/app/settings/integrations' },
          { label: data.name },
        ]}
      />
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <LinearIcon size={20} /> {data.name}
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={toggleEnabled}>
              {data.enabled ? (
                <>
                  <PowerOff className="mr-2 size-4" /> Disable
                </>
              ) : (
                <>
                  <Power className="mr-2 size-4" /> Enable
                </>
              )}
            </Button>
            <HeaderActionButton
              variant="danger"
              icon={Trash2}
              label="Delete"
              onClick={handleDelete}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <LinearProviderCard
            installed
            connected={data.status === 'connected'}
            configured={Boolean(data.lastSyncAt)}
            syncingProjects={0}
            configuredInstances={1}
            onConnect={() => setPickerOpen(true)}
            onManage={() => setPickerOpen(true)}
          />

          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 text-sm font-medium">Recent sync activity</h3>
            <LinearSyncLog integrationId={data.id} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <h3 className="text-sm font-medium">Quick actions</h3>
            <div className="mt-3 flex flex-col gap-2">
              <Button
                variant="secondary"
                onClick={() => setPickerOpen(true)}
                className="w-full justify-start"
              >
                Pull a Linear project…
              </Button>
            </div>
          </div>
          <div className="rounded-lg border bg-card p-4 text-sm">
            <h3 className="font-medium">About sync</h3>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li>• Projects: one-way (Linear → APM)</li>
              <li>• Tasks: two-way with hybrid conflict policy</li>
              <li>• Locked fields: name, description, icon, color, status, priority, health</li>
              <li>• Editable locally: members, progress, AI context, custom metadata</li>
            </ul>
          </div>
        </div>
      </div>

      <LinearProjectsTable
        integrationId={data.id}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSynced={() => {
          /* refresh handled by mutation invalidation */
        }}
      />
    </PageShell>
  );
}
