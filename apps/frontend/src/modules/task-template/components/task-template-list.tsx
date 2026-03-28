import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTaskTemplates } from '../hooks/use-task-templates';
import type { TaskTemplate } from '../api/task-template-api';

interface TaskTemplateListProps {
  projectId?: string;
  onSelectTemplate?: (template: TaskTemplate) => void;
}

export function TaskTemplateList({ projectId, onSelectTemplate }: TaskTemplateListProps) {
  const { data: templates, isLoading } = useTaskTemplates(projectId);

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-muted-foreground">Loading templates...</div>;
  }

  if (!templates || templates.length === 0) {
    return <div className="p-4 text-center text-sm text-muted-foreground">No templates available</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {templates.map((template) => (
        <Card key={template.id} className="border-border bg-muted/50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-md m-0 font-medium text-foreground">{template.name}</h4>
              {template.description ? <p className="mt-1 text-sm text-muted-foreground">{template.description}</p> : null}
              <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                {template.category ? <span>{template.category}</span> : null}
                <span>{template.items?.length || 0} tasks</span>
              </div>
            </div>
            <Button variant="default" size="sm" onClick={() => onSelectTemplate?.(template)} disabled={!projectId}>
              Use
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function TaskTemplateCard({ template, onUse }: { template: TaskTemplate; onUse: () => void }) {
  return (
    <Card className="border-border bg-muted/50 p-3">
      <h4 className="text-md m-0 font-medium text-foreground">{template.name}</h4>
      {template.description ? <p className="my-1 text-sm text-muted-foreground">{template.description}</p> : null}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{template.items?.length || 0} tasks</span>
        <Button variant="default" size="sm" onClick={onUse}>
          Use Template
        </Button>
      </div>
    </Card>
  );
}
