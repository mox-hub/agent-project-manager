import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { Settings2, GitBranch, Cloud, BookOpen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectDetail } from '../hooks/use-project-detail';
import { useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectConfig, useUpdateProjectConfig } from '@/modules/config/hooks/use-project-config';
import { RepositoryList } from '@/modules/git/components/repository-list';
import { WorkspaceConfig } from '@/modules/git/components/workspace-config';
import { GitToolStatusPanel } from '@/modules/git/components/git-tool-status';
import { ExternalLinksManager } from '../components/external-links-manager';
import { DocLinksManager } from '../components/doc-links-manager';
import { ApiDocLinksManager } from '../components/api-doc-links-manager';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProjectType, ProjectVisibility } from '../api/project-api';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { ProjectDetailFrame } from '../components/dashboard/project-detail-frame';

type SettingsTab = 'general' | 'git' | 'cloud' | 'docs';

const SETTINGS_TABS: Array<{
  id: SettingsTab;
  label: string;
  icon: typeof Settings2;
}> = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'git', label: 'Git & Terminal', icon: GitBranch },
  { id: 'cloud', label: 'Cloud Sync', icon: Cloud },
  { id: 'docs', label: 'Documentation', icon: BookOpen },
];

const sectionClasses = 'mb-5';
const fieldLabelClasses = 'mb-1 block text-sm text-muted-foreground font-medium';

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, isLoading: projectLoading } = useProjectDetail(projectId || '');
  const updateProject = useUpdateProject();
  const { data: config = {}, isLoading: configLoading } = useProjectConfig(projectId || '', [
    'project.git.defaultBranch',
    'project.git.commitTemplate',
    'project.git.branchNaming',
    'project.terminal.defaultCwd',
    'project.terminal.defaultShell',
    'project.terminal.env',
  ]);
  const updateConfig = useUpdateProjectConfig(projectId || '');

  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isSaving, setIsSaving] = useState(false);
  const projectForm = useForm<{
    name: string;
    description: string;
    type: ProjectType;
    visibility: ProjectVisibility;
  }>({
    defaultValues: {
      name: '',
      description: '',
      type: 'team',
      visibility: 'internal',
    },
  });
  const configForm = useForm<{
    defaultBranch: string;
    commitTemplate: string;
    branchNaming: string;
    defaultCwd: string;
    defaultShell: string;
    env: string;
  }>({
    defaultValues: {
      defaultBranch: '',
      commitTemplate: '',
      branchNaming: '',
      defaultCwd: '',
      defaultShell: '',
      env: '',
    },
  });

  useEffect(() => {
    if (!project) return;
    projectForm.reset({
      name: project.name,
      description: project.description || '',
      type: project.type,
      visibility: project.visibility,
    });
  }, [project, projectForm]);

  useEffect(() => {
    if (configLoading || Object.keys(config).length === 0) return;
    configForm.reset({
      defaultBranch: config['project.git.defaultBranch'] || '',
      commitTemplate: config['project.git.commitTemplate'] || '',
      branchNaming: config['project.git.branchNaming'] || '',
      defaultCwd: config['project.terminal.defaultCwd'] || '',
      defaultShell: config['project.terminal.defaultShell'] || '',
      env: config['project.terminal.env'] || '',
    });
  }, [config, configForm, configLoading]);

  const handleSaveProject = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        projectId,
        data: projectForm.getValues(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const configValues = configForm.getValues();
      const configToSave: Record<string, unknown> = {};
      if (configValues.defaultBranch) configToSave['project.git.defaultBranch'] = configValues.defaultBranch;
      if (configValues.commitTemplate) configToSave['project.git.commitTemplate'] = configValues.commitTemplate;
      if (configValues.branchNaming) configToSave['project.git.branchNaming'] = configValues.branchNaming;
      if (configValues.defaultCwd) configToSave['project.terminal.defaultCwd'] = configValues.defaultCwd;
      if (configValues.defaultShell) configToSave['project.terminal.defaultShell'] = configValues.defaultShell;
      if (configValues.env) {
        try {
          configToSave['project.terminal.env'] = JSON.parse(configValues.env);
        } catch {
          configToSave['project.terminal.env'] = configValues.env;
        }
      }
      await updateConfig.mutateAsync(configToSave);
    } finally {
      setIsSaving(false);
    }
  };

  if (projectLoading || !projectId) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading project settings...</div>
    );
  }

  return (
    <ProjectDetailFrame
      aiPage={CORE_AI_PAGE_IDS.projectSettings}
      projectId={projectId}
      projectName={project?.name}
      title="Settings"
      hideBreadcrumb
      description="Configure project metadata, Git integration, cloud sync, and documentation links."
    >
      <div className="flex overflow-hidden rounded-xl border border-border bg-background">
        {/* Settings Sidebar */}
        <div className="w-56 shrink-0 border-r border-border bg-muted/20 p-3 space-y-0.5">
          <p className="mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Project Settings
          </p>
          {SETTINGS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs transition-colors',
                  activeTab === tab.id
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                )}
                data-ai-component={`project.project-settings.tab.${tab.id}`}
                data-ai-action={`project.project-settings.tab.${tab.id}.click`}
                data-ai-role="filter"
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}

          <div className="mt-4 border-t border-border pt-4">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-xs text-destructive transition-colors hover:bg-destructive/10"
              data-ai-component="project.project-settings.danger.delete"
              data-ai-action="project.project-settings.danger.delete.click"
              data-ai-role="action"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Project
            </button>
          </div>
        </div>

        {/* Settings Content */}
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-3xl space-y-6 px-8 py-6">
            {activeTab === 'general' && (
              <div
                className="space-y-4"
                data-ai-component="project.project-settings.general"
                data-ai-role="content"
              >
                <div>
                  <h2 className="text-base font-semibold">General Settings</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Configure basic project properties
                  </p>
                </div>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>Project Information</CardTitle>
                    <CardDescription>Basic project details and metadata</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Form {...projectForm}>
                      <div className="space-y-1">
                        <FormField
                          control={projectForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem className={sectionClasses}>
                              <FormLabel className={fieldLabelClasses}>Project Name</FormLabel>
                              <Input
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                data-ai-component="project.project-settings.general.name"
                                data-ai-action="project.project-settings.general.name.change"
                                data-ai-role="input"
                              />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={projectForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem className={sectionClasses}>
                              <FormLabel className={fieldLabelClasses}>Description</FormLabel>
                              <Textarea
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                rows={4}
                                data-ai-component="project.project-settings.general.description"
                                data-ai-action="project.project-settings.general.description.change"
                                data-ai-role="input"
                              />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={projectForm.control}
                            name="type"
                            render={({ field }) => (
                              <FormItem className={sectionClasses}>
                                <FormLabel className={fieldLabelClasses}>Type</FormLabel>
                                <NativeSelect
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value as ProjectType)}
                                  data-ai-component="project.project-settings.general.type"
                                  data-ai-action="project.project-settings.general.type.change"
                                  data-ai-role="select"
                                >
                                  <NativeSelectOption value="personal">Personal</NativeSelectOption>
                                  <NativeSelectOption value="team">Team</NativeSelectOption>
                                  <NativeSelectOption value="experiment">Experiment</NativeSelectOption>
                                  <NativeSelectOption value="enterprise">Enterprise</NativeSelectOption>
                                </NativeSelect>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={projectForm.control}
                            name="visibility"
                            render={({ field }) => (
                              <FormItem className={sectionClasses}>
                                <FormLabel className={fieldLabelClasses}>Visibility</FormLabel>
                                <NativeSelect
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value as ProjectVisibility)}
                                  data-ai-component="project.project-settings.general.visibility"
                                  data-ai-action="project.project-settings.general.visibility.change"
                                  data-ai-role="select"
                                >
                                  <NativeSelectOption value="private">Private</NativeSelectOption>
                                  <NativeSelectOption value="internal">Internal</NativeSelectOption>
                                  <NativeSelectOption value="public">Public</NativeSelectOption>
                                </NativeSelect>
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={handleSaveProject}
                            disabled={isSaving}
                            data-ai-component="project.project-settings.general.save"
                            data-ai-action="project.project-settings.general.save.click"
                            data-ai-role="submit"
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>Git Tool Status</CardTitle>
                    <CardDescription>Check Git tool availability and configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <GitToolStatusPanel />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'git' && (
              <div
                className="space-y-4"
                data-ai-component="project.project-settings.git"
                data-ai-role="content"
              >
                <div>
                  <h2 className="text-base font-semibold">Git & Terminal</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Repository, branch and terminal conventions
                  </p>
                </div>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>Workspace Configuration</CardTitle>
                    <CardDescription>Configure workspace directory and remote repository</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <WorkspaceConfig projectId={projectId} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>Git Repositories</CardTitle>
                    <CardDescription>Manage repositories associated with this project</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <RepositoryList projectId={projectId} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>Git Configuration</CardTitle>
                    <CardDescription>Project-specific Git settings</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Form {...configForm}>
                      <div className="space-y-1">
                        <FormField
                          control={configForm.control}
                          name="defaultBranch"
                          render={({ field }) => (
                            <FormItem className={sectionClasses}>
                              <FormLabel className={fieldLabelClasses}>Default Branch</FormLabel>
                              <Input
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                placeholder="main"
                                data-ai-component="project.project-settings.git.default-branch"
                                data-ai-action="project.project-settings.git.default-branch.change"
                                data-ai-role="input"
                              />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={configForm.control}
                          name="commitTemplate"
                          render={({ field }) => (
                            <FormItem className={sectionClasses}>
                              <FormLabel className={fieldLabelClasses}>Commit Message Template</FormLabel>
                              <Textarea
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                rows={3}
                                placeholder="e.g., [TASK-{id}] {description}"
                                data-ai-component="project.project-settings.git.commit-template"
                                data-ai-action="project.project-settings.git.commit-template.change"
                                data-ai-role="input"
                              />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={configForm.control}
                          name="branchNaming"
                          render={({ field }) => (
                            <FormItem className={sectionClasses}>
                              <FormLabel className={fieldLabelClasses}>Branch Naming Convention</FormLabel>
                              <Input
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                placeholder="e.g., feature/{task-id}-{description}"
                                data-ai-component="project.project-settings.git.branch-naming"
                                data-ai-action="project.project-settings.git.branch-naming.change"
                                data-ai-role="input"
                              />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={configForm.control}
                            name="defaultCwd"
                            render={({ field }) => (
                              <FormItem className={sectionClasses}>
                                <FormLabel className={fieldLabelClasses}>Default Working Directory</FormLabel>
                                <Input
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
                                  placeholder="Leave empty to use project root"
                                  data-ai-component="project.project-settings.terminal.default-cwd"
                                  data-ai-action="project.project-settings.terminal.default-cwd.change"
                                  data-ai-role="input"
                                />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={configForm.control}
                            name="defaultShell"
                            render={({ field }) => (
                              <FormItem className={sectionClasses}>
                                <FormLabel className={fieldLabelClasses}>Default Shell</FormLabel>
                                <NativeSelect
                                  value={field.value}
                                  onChange={(event) => field.onChange(event.target.value)}
                                  data-ai-component="project.project-settings.terminal.default-shell"
                                  data-ai-action="project.project-settings.terminal.default-shell.change"
                                  data-ai-role="select"
                                >
                                  <NativeSelectOption value="">Use global default</NativeSelectOption>
                                  <NativeSelectOption value="pwsh">PowerShell (pwsh)</NativeSelectOption>
                                  <NativeSelectOption value="bash">Bash</NativeSelectOption>
                                  <NativeSelectOption value="zsh">Zsh</NativeSelectOption>
                                  <NativeSelectOption value="cmd">CMD (Windows)</NativeSelectOption>
                                </NativeSelect>
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={configForm.control}
                          name="env"
                          render={({ field }) => (
                            <FormItem className={sectionClasses}>
                              <FormLabel className={fieldLabelClasses}>Environment Variables (JSON)</FormLabel>
                              <Textarea
                                value={field.value}
                                onChange={(event) => field.onChange(event.target.value)}
                                rows={4}
                                placeholder='{"NODE_ENV":"development"}'
                                data-ai-component="project.project-settings.terminal.env"
                                data-ai-action="project.project-settings.terminal.env.change"
                                data-ai-role="input"
                              />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={handleSaveConfig}
                            disabled={isSaving}
                            data-ai-component="project.project-settings.git.save"
                            data-ai-action="project.project-settings.git.save.click"
                            data-ai-role="submit"
                          >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </div>
                      </div>
                    </Form>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'cloud' && (
              <div
                className="space-y-4"
                data-ai-component="project.project-settings.cloud"
                data-ai-role="content"
              >
                <div>
                  <h2 className="text-base font-semibold">Cloud Sync</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Link and sync with GitHub Projects, Linear, or Jira
                  </p>
                </div>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>Cloud Project Synchronization</CardTitle>
                    <CardDescription>Link and sync with external project management platforms</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ExternalLinksManager projectId={projectId} />
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === 'docs' && (
              <div
                className="space-y-4"
                data-ai-component="project.project-settings.docs"
                data-ai-role="content"
              >
                <div>
                  <h2 className="text-base font-semibold">Documentation</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Manage external and API documentation links
                  </p>
                </div>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>External Documentation</CardTitle>
                    <CardDescription>Link to Notion, Confluence, Google Docs, etc.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <DocLinksManager projectId={projectId} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-border">
                    <CardTitle>API Documentation</CardTitle>
                    <CardDescription>Link to Swagger, Apifox, Postman, etc.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ApiDocLinksManager projectId={projectId} />
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </ProjectDetailFrame>
  );
}
