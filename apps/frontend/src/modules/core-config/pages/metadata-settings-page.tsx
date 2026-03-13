import { TagManager } from '../components/tag-manager';
import { StatusManager } from '../components/status-manager';
import { RoleManager } from '../components/role-manager';
import { TemplateManager } from '../components/template-manager';
import { colors, spacing, typography } from '@/shared/theme/tokens';

const SECTION_IDS = ['labels', 'statuses', 'roles', 'templates'] as const;

const SIDEBAR_ITEMS: { id: (typeof SECTION_IDS)[number]; label: string }[] = [
  { id: 'labels', label: 'Global Labels' },
  { id: 'statuses', label: 'Status Mapping' },
  { id: 'roles', label: 'Role Definition' },
  { id: 'templates', label: 'Templates' },
];

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function MetadataSettingsPage() {
  return (
    <div
      className="flex min-h-full"
      style={{ color: colors.textPrimary, maxWidth: 1400, margin: '0 auto', width: '100%' }}
    >
      {/* Left: Section nav (DATA MAINTENANCE) */}
      <aside
        className="hidden lg:flex w-52 shrink-0 flex-col border-r pl-2 pr-4 py-6"
        style={{ borderColor: colors.borderSubtle }}
      >
        <div style={{ marginBottom: spacing.lg }}>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider opacity-70">
            System Settings
          </h2>
          <p className="mt-1 text-xs uppercase tracking-wider opacity-60">Data maintenance</p>
        </div>
        <nav className="flex flex-col gap-0.5">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => scrollToSection(item.id)}
              className="text-left rounded-md px-3 py-2 text-sm transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ color: colors.textSecondary }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Right: Flowing content */}
      <div className="flex-1 overflow-auto" style={{ padding: `${spacing.xl}px` }}>
        <header
          className="mb-8 pb-4"
          style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
        >
          <h1 style={{ fontSize: typography.xl, fontWeight: 600, margin: 0 }}>
            System Settings
          </h1>
          <p style={{ fontSize: typography.sm, color: colors.textSecondary, marginTop: spacing.xs }}>
            Manage tags, statuses, roles, and templates for your projects. All metadata modules are listed below.
          </p>
        </header>

        <div className="flex flex-col gap-14">
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
  );
}
