import * as React from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, RefreshCw, X } from 'lucide-react';
import { LinearIcon } from '@/components/icons/linear';
import { LinearSyncLog } from './linear-sync-log';
import { useIntegrations } from '@/modules/integration/hooks/use-integrations';

interface LinearSyncLogDrawerProps {
  /** Render a trigger button. If false, the drawer is controlled. */
  trigger?: boolean;
  /** Pre-selected integration (defaults to the first Linear integration) */
  integrationId?: string;
  /** When controlled, override the open state */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function LinearSyncLogDrawer({
  trigger = true,
  integrationId,
  open: controlledOpen,
  onOpenChange,
}: LinearSyncLogDrawerProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };

  const { data: integrations } = useIntegrations();
  const linearIntegrations = (integrations?.data ?? []).filter(
    (i) => i.provider === 'linear',
  );
  const [selectedIntegration, setSelectedIntegration] = useState<
    string | undefined
  >(integrationId);

  const resolvedIntegrationId =
    selectedIntegration ?? linearIntegrations[0]?.id ?? '';

  // 组合件 items：base-ui Select.Root 必须拿到 items 才能把 value 映射成 label（trigger 显示名称而非 id）
  const integrationOptions =
    linearIntegrations.length === 0
      ? [{ value: '', label: 'No Linear integration configured' }]
      : linearIntegrations.map((i) => ({ value: i.id, label: i.name }));

  return (
    <>
      {trigger ? (
        <HeaderActionButton
          variant="outline"
          icon={History}
          label={t('linearSync.log')}
          onClick={() => setOpen(true)}
          data-ai-component="linear.sync-log.drawer.trigger"
          data-ai-action="linear.sync-log.drawer.trigger.click"
        />
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent maxWidth="lg" >
          {/* 布局下沉：SheetContent 基线 gap-4 在此不适用（分区自管内距/描边），
              由调用方 wrapper（无 gap）承载零间距；flex-1/min-h-0 保日志区撑满与内部滚动几何不变 */}
          <div className="flex min-h-0 flex-1 flex-col">
          <SheetHeader >
            <div className="flex items-center justify-between gap-2">
              <SheetTitle>
                {/* 布局下沉：图标+标题行由调用方结构承载（span 合法于 h2 内） */}
                <span className="flex items-center gap-2">
                  <LinearIcon size={16} /> {t('linearSync.logTitle')}
                </span>
              </SheetTitle>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
              >
                <X className="size-3.5" />
              </Button>
            </div>
            <SheetDescription>
              Recent Linear sync activity. Auto-refreshes every 30 seconds.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 text-xs">
            <span className="text-muted-foreground">Integration:</span>
            <Select
              value={resolvedIntegrationId}
              onValueChange={(value) => setSelectedIntegration(String(value))}
              items={integrationOptions}
            >
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {integrationOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost"
              type="button"
              className="ml-auto inline-flex items-center"
              onClick={() => setSelectedIntegration((c) => c)}
              title="Refresh"
            >
              <RefreshCw className="size-3" />
              refresh
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3">
            {resolvedIntegrationId ? (
              <LinearSyncLog integrationId={resolvedIntegrationId} limit={100} />
            ) : (
              <div className="text-xs text-muted-foreground">
                Connect a Linear integration first to see sync activity.
              </div>
            )}
          </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}