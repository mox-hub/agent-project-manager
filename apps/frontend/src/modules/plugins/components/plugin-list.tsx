import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { usePlugins, useEnablePlugin, useDisablePlugin, useUninstallPlugin } from '../hooks/use-plugins';
import type { PluginInfo } from '../api/plugin-api';
import { cn } from '@/lib/utils';
import { Plug, Power, Trash2 } from 'lucide-react';

export function PluginList() {
  const { data: plugins, isLoading } = usePlugins();
  const enablePlugin = useEnablePlugin();
  const disablePlugin = useDisablePlugin();
  const uninstallPlugin = useUninstallPlugin();

  if (isLoading) {
    return <div className="p-4">Loading plugins...</div>;
  }

  if (!plugins || plugins.length === 0) {
    return (
      <EmptyState
        title="No plugins installed"
        description="Install plugins to extend the functionality of your workspace."
      />
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {plugins.map((plugin) => (
        <PluginCard
          key={plugin.id}
          plugin={plugin}
          onEnable={() => enablePlugin.mutate(plugin.id)}
          onDisable={() => disablePlugin.mutate(plugin.id)}
          onUninstall={() => uninstallPlugin.mutate(plugin.id)}
          isEnabling={enablePlugin.isPending}
          isDisabling={disablePlugin.isPending}
          isUninstalling={uninstallPlugin.isPending}
        />
      ))}
    </div>
  );
}

interface PluginCardProps {
  plugin: PluginInfo;
  onEnable: () => void;
  onDisable: () => void;
  onUninstall: () => void;
  isEnabling?: boolean;
  isDisabling?: boolean;
  isUninstalling?: boolean;
}

function PluginCard({ plugin, onEnable, onDisable, onUninstall, isEnabling, isDisabling, isUninstalling }: PluginCardProps) {
  return (
    <Card className={cn(!plugin.enabled && 'opacity-60')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Plug className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{plugin.name}</CardTitle>
              <CardDescription className="text-xs">v{plugin.version}</CardDescription>
            </div>
          </div>
          <Badge variant={plugin.enabled ? 'default' : 'secondary'}>
            {plugin.enabled ? 'Active' : 'Disabled'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {plugin.description && (
          <p className="mb-3 text-sm text-muted-foreground">{plugin.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {plugin.scope}
          </Badge>
          {plugin.author && <span>by {plugin.author}</span>}
        </div>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={plugin.enabled ? onDisable : onEnable}
            disabled={isEnabling || isDisabling}
          >
            <Power className="mr-1 h-3 w-3" />
            {plugin.enabled ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onUninstall}
            disabled={isUninstalling}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            Remove
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
