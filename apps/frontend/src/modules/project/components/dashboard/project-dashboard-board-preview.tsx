import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';
import type { KanbanPreviewColumn } from './project-dashboard-data';

interface ProjectDashboardBoardPreviewProps {
  projectId: string;
  columns: KanbanPreviewColumn[];
}

const columnDotClassMap: Record<KanbanPreviewColumn['id'], string> = {
  todo: 'bg-content-text-tertiary',
  'in-progress': 'bg-accent-blue',
  review: 'bg-accent-yellow',
  done: 'bg-accent-green',
};

export function ProjectDashboardBoardPreview({ projectId, columns }: ProjectDashboardBoardPreviewProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between border-t border-content-border pt-4">
        <h3 className="mb-0 text-lg font-bold text-content-text">Project Board Preview</h3>
        <Link
          to={`/app/projects/${projectId}/tasks`}
          className="flex items-center gap-1 text-sm font-bold text-accent-blue no-underline hover:underline"
        >
          View Full Board
          <ChevronRight size={16} />
        </Link>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.id} className="min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${columnDotClassMap[column.id]}`} />
                <h4 className="mb-0 text-[12px] font-bold uppercase tracking-wider text-content-text-secondary">
                  {column.title} ({column.count})
                </h4>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {column.tasks.map((task) => (
                <Card key={task.id} className="cursor-pointer border-l-4 p-3 transition-colors hover:border-content-border">
                  <div className="mb-2 flex gap-1">
                    {task.priority === 'high' ? <Badge variant="warning">High</Badge> : null}
                  </div>
                  <p className="mb-0 text-sm font-medium leading-relaxed text-content-text">{task.title}</p>
                  {task.assignee ? (
                    <div className="mt-2 flex items-center justify-between">
                      <div className="h-6 w-6 rounded-full bg-accent-blue" />
                      {task.pending ? <Badge variant="warning" className="text-[10px]">Pending AI Audit</Badge> : null}
                    </div>
                  ) : null}
                </Card>
              ))}

              {column.id === 'done' && column.tasks.length === 0 ? (
                <Card className="flex cursor-pointer items-center justify-center border-dashed py-3">
                  <Button variant="ghost" className="text-[12px] uppercase tracking-wider text-content-text-tertiary">
                    Archived Tasks
                  </Button>
                </Card>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
