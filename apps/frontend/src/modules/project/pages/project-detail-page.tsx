import { Link, useParams } from 'react-router-dom';
import { PageShell } from '@/components/ui/page-shell';
import { SectionCard } from '@/components/ui/section-card';
import { StatCard } from '@/components/ui/stat-card';
import { useProjectDetail } from '../hooks/use-project-detail';

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading, isError, error } = useProjectDetail(projectId);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6 text-center text-sm text-content-text-secondary">
        Loading project...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="mx-auto flex max-w-[600px] flex-col items-center justify-center p-6 text-center">
        <h2 className="mb-3 text-xl font-semibold text-accent-red">Failed to load project</h2>
        <p className="mb-4 text-sm text-content-text-secondary">
          {error instanceof Error
            ? error.message
            : 'The project could not be loaded. It may not exist or you may not have permission to view it.'}
        </p>
        <Link
          to="/app"
          className="inline-block rounded-md border border-content-border bg-content-bg px-4 py-2 text-sm font-medium text-content-text no-underline hover:bg-content-bg-secondary"
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  return (
    <PageShell className="p-6">
      <div className="mx-auto w-full max-w-5xl">
        <nav className="mb-2 text-xs text-content-text-secondary">
          <Link to="/app" className="text-accent-blue no-underline hover:underline">
            Projects
          </Link>
          <span> / </span>
          <span>{project.name}</span>
        </nav>

        <header className="mb-4">
          <h1 className="mb-2 text-2xl font-semibold text-content-text">{project.name}</h1>
          {project.description ? <p className="max-w-2xl text-sm text-content-text-secondary">{project.description}</p> : null}
        </header>

        <section className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full bg-accent-blue/10 px-2 py-1 text-accent-blue">{project.type}</span>
          <span className="rounded-full bg-content-bg-secondary px-2 py-1 text-content-text-secondary">{project.visibility}</span>
          <span
            className={`rounded-full px-2 py-1 ${
              project.status === 'active'
                ? 'bg-accent-green-light text-accent-green'
                : 'bg-accent-yellow-light text-accent-yellow'
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
            <Link
              to={`/app/projects/${project.id}/tasks`}
              className="inline-flex h-8 items-center rounded-md bg-accent-blue px-3 text-sm font-medium text-white no-underline hover:bg-accent-blue/90"
            >
              Open Task Board
            </Link>
          </div>
        </SectionCard>
      </div>
    </PageShell>
  );
}
