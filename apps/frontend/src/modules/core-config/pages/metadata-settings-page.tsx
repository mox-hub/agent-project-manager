import { TagManager } from '../components/tag-manager';
import { StatusManager } from '../components/status-manager';
import { RoleManager } from '../components/role-manager';
import { TemplateManager } from '../components/template-manager';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Settings } from 'lucide-react';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';

const SIDEBAR_ITEMS = [
  { id: 'labels', label: 'Global Labels' },
  { id: 'statuses', label: 'Status Mapping' },
  { id: 'roles', label: 'Role Definition' },
  { id: 'templates', label: 'Templates' },
] as const;

function scrollToSection(id: (typeof SIDEBAR_ITEMS)[number]['id']) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function MetadataSettingsPage() {
  // FROZEN-UI: keep current metadata page implementation/style unchanged for Figma replication scope.
  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.metadataSettings}>
      <PageHeader
        aiId="settings.metadata-settings"
        title="System Settings"
        description="Manage tags, statuses, roles, and templates for all projects."
        icon={Settings}
        iconColor="text-accent-purple"
      />
      <div
        className="mx-auto flex min-h-full w-full max-w-[1400px] text-foreground motion-enter"
        data-ai-component="settings.metadata-settings.layout"
        data-ai-role="content"
      >
        <aside className="hidden w-56 shrink-0 flex-col rounded-xl border border-border bg-muted/50 p-4 lg:flex">
          <div className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">System Settings</h2>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">Data Maintenance</p>
          </div>
          <nav className="flex flex-col gap-1">
            {SIDEBAR_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="rounded-md px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50"
                data-ai-component={`settings.metadata-settings.sidebar.${item.id}`}
                data-ai-action={`settings.metadata-settings.sidebar.${item.id}.jump`}
                data-ai-role="jump"
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1 px-0 lg:pl-4">
          <section
            className="mb-6 rounded-xl border border-border bg-muted/50 p-3"
            data-ai-component="settings.metadata-settings.context-bar"
            data-ai-role="filter"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-background px-2 py-1">Labels</span>
              <span className="rounded-full bg-background px-2 py-1">Statuses</span>
              <span className="rounded-full bg-background px-2 py-1">Roles</span>
              <span className="rounded-full bg-background px-2 py-1">Templates</span>
            </div>
          </section>

          <div className="flex flex-col gap-10">
            <section id="labels" className="scroll-mt-6">
              <TagManager />
            </section>
            <section id="statuses" className="scroll-mt-6">
              <StatusManager />
            </section>
            <section id="roles" className="scroll-mt-6">
              <RoleManager />
            </section>
            <section id="templates" className="scroll-mt-6">
              <TemplateManager />
            </section>
          </div>

        </div>
      </div>
    </PageShell>
  );
}
