import { Link, useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { useProjectDetail } from '../hooks/use-project-detail';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error } = useProjectDetail(projectId);

  if (isLoading) {
    return (
      <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectDetail}>
        <div className="flex min-h-[50vh] items-center justify-center text-center text-sm text-muted-foreground">
          Loading project...
        </div>
      </PageShell>
    );
  }

  if (isError || !project) {
    return (
      <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectDetail}>
        <div className="mx-auto flex max-w-[600px] flex-col items-center justify-center text-center">
          <h2 className="mb-3 text-xl font-semibold text-accent-red">Failed to load project</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : 'The project could not be loaded. It may not exist or you may not have permission to view it.'}
          </p>
          <Link
            to="/app"
            className="inline-block rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground no-underline hover:bg-muted/50"
          >
            Back to Projects
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectDetail}>
      <div className="mx-auto w-full max-w-[1280px]">
        <nav className="mb-2 text-xs text-muted-foreground">
          <Link to="/app" className="text-accent-blue no-underline hover:underline">
            Projects
          </Link>
          <span> / </span>
          <span>{project.name}</span>
        </nav>

        <section
          className="mb-4 rounded-xl border border-border bg-muted/50 p-4 motion-enter"
          data-ai-component="project.project-detail.header"
          data-ai-role="content"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <h1 className="truncate text-2xl font-semibold text-foreground">{project.name}</h1>
                <Badge variant="secondary">{project.type}</Badge>
                <Badge variant="outline" className="capitalize">
                  {project.status}
                </Badge>
              </div>
              {project.description ? (
                <p className="max-w-2xl text-sm text-muted-foreground">{project.description}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No description.</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to={`/app/projects/${project.id}/dashboard`}
                className={buttonVariants({ variant: 'secondary', size: 'sm' })}
              >
                Dashboard
              </Link>
              <Link to={`/app/projects/${project.id}/board`} className={buttonVariants({ size: 'sm' })}>
                Open Task Board
              </Link>
            </div>
          </div>
        </section>

        <ProjectDetailNav projectId={project.id} />

        <section
          className="mb-4 flex flex-wrap gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground"
          data-ai-component="project.project-detail.context-bar"
          data-ai-role="filter"
        >
          <span className="rounded-full bg-background px-3 py-1">{project.type}</span>
          <span className="rounded-full bg-background px-3 py-1">{project.visibility}</span>
          <span
            className={`rounded-full px-3 py-1 ${
              project.status === 'active' ? 'bg-accent-green-light text-accent-green' : 'bg-accent-yellow-light text-accent-yellow'
            }`}
          >
            {project.status}
          </span>
        </section>

        {project._count ? (
          <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            <StatCard label="Tasks" value={project._count.tasks ?? 0} />
            <StatCard label="Iterations" value={project._count.iterations ?? 0} />
            <StatCard label="Status" value={project.status} />
          </section>
        ) : null}

        <SectionCard title="Work" contentClassName="pt-0">
          <div className="flex flex-wrap gap-2">
            <Link to={`/app/projects/${project.id}/board`} className={buttonVariants({ size: 'sm' })}>
              Open Task Board
            </Link>
          </div>
        </SectionCard>

        <SectionCard title="Quick Access" contentClassName="pt-0">
          <div className="flex flex-wrap gap-2">
            <Link
              to={`/app/projects/${project.id}/team`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Team Workload
            </Link>
            <Link
              to={`/app/projects/${project.id}/milestones`}
              className={buttonVariants({ variant: 'secondary', size: 'sm' })}
            >
              Milestones
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
