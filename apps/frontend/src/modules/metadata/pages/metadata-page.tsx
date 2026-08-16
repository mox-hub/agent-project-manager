/**
 * metadata-page.tsx - 元数据管理页面（Metadata）
 *
 * 还原参考: refers/APM/src/app/pages/MetadataPage.tsx
 * 状态:     DEV ONLY（仅 develop 模式展示，生产不注册路由）
 *
 * 说明:
 * - 页面形态（左导航 + PageHeader + 主内容区）对齐 refer 设计
 * - Labels / Statuses / Roles / Templates 四个 Tab 复用 core-config 模块
 *   的 TagManager / StatusManager / RoleManager / TemplateManager（真实 API）
 * - ⚠️ 缺失真实数据的区块（如空态提示）保持展示形态，不注入假数据；
 *   纯展示性占位标记 data-mock="true"（当前无，待接真实数据时移除）
 */
import { useState } from 'react';
import { Database, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { TagManager } from '@/modules/core-config/components/tag-manager';
import { StatusManager } from '@/modules/core-config/components/status-manager';
import { RoleManager } from '@/modules/core-config/components/role-manager';
import { TemplateManager } from '@/modules/core-config/components/template-manager';

type MainTab = 'labels' | 'statuses' | 'roles' | 'templates';

export function MetadataPage() {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('labels');

  const mainTabs = [
    { key: 'labels' as MainTab, label: 'Labels' },
    { key: 'statuses' as MainTab, label: 'Statuses' },
    { key: 'roles' as MainTab, label: 'Roles' },
    { key: 'templates' as MainTab, label: 'Templates' },
  ];

  const sidebarItems = [
    { key: 'labels' as MainTab, label: 'Global Labels' },
    { key: 'statuses' as MainTab, label: 'Status Mapping' },
    { key: 'roles' as MainTab, label: 'Role Definition' },
    { key: 'templates' as MainTab, label: 'Templates' },
  ];

  return (
    <div className="flex h-full overflow-hidden" data-ai-page="metadata.metadata.main">
      {/* Sidebar Navigation */}
      <div className="w-56 border-r border-border bg-sidebar shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground mb-1">SYSTEM SETTINGS</h2>
          <p className="text-xs text-muted-foreground">DATA MAINTENANCE</p>
        </div>
        <nav className="p-2 space-y-0.5">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveMainTab(item.key)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-xs transition-colors',
                activeMainTab === item.key
                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
              data-ai-action="metadata.nav.switch"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <PageHeader
          icon={Database}
          title="Metadata"
          description="Manage labels, statuses, roles, and templates for all projects"
          actions={
            <Button size="sm">
              <Settings className="w-3.5 h-3.5 mr-1.5" />
              Settings
            </Button>
          }
        />

        {/* Main Tabs */}
        <div className="border-b border-border shrink-0">
          <div className="flex px-6">
            {mainTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveMainTab(tab.key)}
                className={cn(
                  'px-4 py-3 text-xs font-medium border-b-2 transition-colors',
                  activeMainTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
                data-ai-action="metadata.tab.switch"
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-6 space-y-6 max-w-6xl">
            {activeMainTab === 'labels' && <TagManager />}
            {activeMainTab === 'statuses' && <StatusManager />}
            {activeMainTab === 'roles' && <RoleManager />}
            {activeMainTab === 'templates' && <TemplateManager />}
          </div>
        </div>
      </div>
    </div>
  );
}
