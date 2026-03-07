import { useState } from 'react';
import { notionColors, notionTypography, notionSpacing, notionRadii } from '@/shared/theme/notion-tokens';
import { Button } from '@/shared/ui/button';
import { useTaskTemplates, useUseTaskTemplate } from '../hooks/use-task-templates';
import type { TaskTemplate } from '../api/task-template-api';

interface TaskTemplateListProps {
  projectId?: string;
  onSelectTemplate?: (template: TaskTemplate) => void;
}

export function TaskTemplateList({ projectId, onSelectTemplate }: TaskTemplateListProps) {
  const { data: templates, isLoading } = useTaskTemplates(projectId);
  const useTemplate = useUseTaskTemplate();

  if (isLoading) {
    return (
      <div style={{ padding: notionSpacing.lg, textAlign: 'center', color: notionColors.text.secondary }}>
        Loading templates...
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div style={{ padding: notionSpacing.lg, textAlign: 'center', color: notionColors.text.secondary }}>
        No templates available
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: notionSpacing.sm }}>
      {templates.map((template) => (
        <div
          key={template.id}
          style={{
            padding: notionSpacing.md,
            backgroundColor: notionColors.background.secondary,
            borderRadius: notionRadii.md,
            border: `1px solid ${notionColors.border.default}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: notionTypography.fontSize.md, fontWeight: notionTypography.fontWeight.medium }}>
                {template.name}
              </h4>
              {template.description && (
                <p style={{ margin: `${notionSpacing.xs} 0 0`, fontSize: notionTypography.fontSize.sm, color: notionColors.text.secondary }}>
                  {template.description}
                </p>
              )}
              <div style={{ display: 'flex', gap: notionSpacing.sm, marginTop: notionSpacing.xs }}>
                {template.category && (
                  <span style={{ fontSize: notionTypography.fontSize.xs, color: notionColors.text.tertiary }}>
                    {template.category}
                  </span>
                )}
                <span style={{ fontSize: notionTypography.fontSize.xs, color: notionColors.text.tertiary }}>
                  {template.items?.length || 0} tasks
                </span>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onSelectTemplate?.(template)}
              disabled={!projectId}
              style={{
                backgroundColor: notionColors.accent.blue,
                color: '#fff',
              }}
            >
              Use
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function TaskTemplateCard({ template, onUse }: { template: TaskTemplate; onUse: () => void }) {
  return (
    <div
      style={{
        padding: notionSpacing.md,
        backgroundColor: notionColors.background.secondary,
        borderRadius: notionRadii.md,
        border: `1px solid ${notionColors.border.default}`,
      }}
    >
      <h4 style={{ margin: 0, fontSize: notionTypography.fontSize.md, fontWeight: notionTypography.fontWeight.medium }}>
        {template.name}
      </h4>
      {template.description && (
        <p style={{ margin: `${notionSpacing.xs} 0`, fontSize: notionTypography.fontSize.sm, color: notionColors.text.secondary }}>
          {template.description}
        </p>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: notionSpacing.md }}>
        <span style={{ fontSize: notionTypography.fontSize.xs, color: notionColors.text.tertiary }}>
          {template.items?.length || 0} tasks
        </span>
        <Button
          variant="primary"
          size="sm"
          onClick={onUse}
          style={{
            backgroundColor: notionColors.accent.blue,
            color: '#fff',
          }}
        >
          Use Template
        </Button>
      </div>
    </div>
  );
}
