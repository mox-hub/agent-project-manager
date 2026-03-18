import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Settings2, GitBranch, Cloud, BookOpen } from 'lucide-react';
import { useProjectDetail } from '../hooks/use-project-detail';
import { useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectConfig, useUpdateProjectConfig } from '@/modules/config/hooks/use-project-config';
import { RepositoryList } from '@/modules/git/components/repository-list';
import { WorkspaceConfig } from '@/modules/git/components/workspace-config';
import { GitToolStatus } from '@/modules/git/components/git-tool-status';
import { ExternalLinksManager } from '../components/external-links-manager';
import { DocLinksManager } from '../components/doc-links-manager';
import { ApiDocLinksManager } from '../components/api-doc-links-manager';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { PageShell } from '@/components/ui/page-shell';
import { AttentionRail } from '@/components/ui/attention-rail';
import { Badge } from '@/components/ui/badge';
import type { ProjectType, ProjectVisibility } from '../api/project-api';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';

type SettingsTab = 'general' | 'git' | 'cloud' | 'docs';

const sectionClasses = 'mb-5';
const fieldLabelClasses = 'mb-1 block text-sm text-content-text-secondary font-medium';

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
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    type: 'team' as ProjectType,
    visibility: 'internal' as ProjectVisibility,
  });
  const [gitConfig, setGitConfig] = useState({
    defaultBranch: '',
    commitTemplate: '',
    branchNaming: '',
  });
  const [terminalConfig, setTerminalConfig] = useState({
    defaultCwd: '',
    defaultShell: '',
    env: '',
  });

  useEffect(() => {
    if (!project) return;
    setProjectForm({
      name: project.name,
      description: project.description || '',
      type: project.type,
      visibility: project.visibility,
    });
  }, [project]);

  useEffect(() => {
    if (configLoading || Object.keys(config).length === 0) return;
    setGitConfig({
      defaultBranch: config['project.git.defaultBranch'] || '',
      commitTemplate: config['project.git.commitTemplate'] || '',
      branchNaming: config['project.git.branchNaming'] || '',
    });
    setTerminalConfig({
      defaultCwd: config['project.terminal.defaultCwd'] || '',
      defaultShell: config['project.terminal.defaultShell'] || '',
      env: config['project.terminal.env'] || '',
    });
  }, [config, configLoading]);

  const handleSaveProject = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      await updateProject.mutateAsync({
        projectId,
        data: projectForm,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!projectId) return;
    setIsSaving(true);
    try {
      const configToSave: Record<string, unknown> = {};
      if (gitConfig.defaultBranch) configToSave['project.git.defaultBranch'] = gitConfig.defaultBranch;
      if (gitConfig.commitTemplate) configToSave['project.git.commitTemplate'] = gitConfig.commitTemplate;
      if (gitConfig.branchNaming) configToSave['project.git.branchNaming'] = gitConfig.branchNaming;
      if (terminalConfig.defaultCwd) configToSave['project.terminal.defaultCwd'] = terminalConfig.defaultCwd;
      if (terminalConfig.defaultShell) configToSave['project.terminal.defaultShell'] = terminalConfig.defaultShell;
      if (terminalConfig.env) {
        try {
          configToSave['project.terminal.env'] = JSON.parse(terminalConfig.env);
        } catch {
          configToSave['project.terminal.env'] = terminalConfig.env;
        }
      }
      await updateConfig.mutateAsync(configToSave);
    } finally {
      setIsSaving(false);
    }
  };

  if (projectLoading || !projectId) {
    return (
      <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectSettings}>
        <div className="text-sm text-content-text-secondary">Loading project settings...</div>
      </PageShell>
    );
  }

  const tabs: Array<{
    id: SettingsTab;
    label: string;
    icon: typeof Settings2;
    description: string;
  }> = [
    { id: 'general', label: 'General', icon: Settings2, description: '项目基础信息与可见性' },
    { id: 'git', label: 'Git & Terminal', icon: GitBranch, description: '仓库、分支和终端约定' },
    { id: 'cloud', label: 'Cloud Sync', icon: Cloud, description: '外部平台链接与同步' },
    { id: 'docs', label: 'Documentation', icon: BookOpen, description: '文档与 API 资料管理' },
  ];

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.projectSettings}>
      <div className="mx-auto w-full max-w-[1280px]">
        <section
          className="mb-4 rounded-xl border border-content-border bg-content-bg-secondary p-5 motion-enter"
          data-ai-component="project.project-settings.header"
          data-ai-role="content"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="m-0 text-2xl font-semibold text-content-text">Project Settings</h1>
              <p className="mt-1 text-sm text-content-text-secondary">
                Configure project-specific settings and integrations.
              </p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {project?.status || 'active'}
            </Badge>
          </div>
        </section>

        <ProjectDetailNav projectId={projectId} />

        <section
          className="mb-4 flex flex-wrap gap-2 rounded-xl border border-content-border bg-content-bg-secondary p-3"
          data-ai-component="project.project-settings.context-bar"
          data-ai-role="filter"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                    : 'border-content-border bg-content-bg text-content-text-secondary hover:bg-content-bg-secondary'
                }`}
                title={tab.description}
                data-ai-component={`project.project-settings.tab.${tab.id}`}
                data-ai-action={`project.project-settings.tab.${tab.id}.click`}
                data-ai-role="filter"
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div data-ai-component="project.project-settings.primary-content" data-ai-role="content">
            {activeTab === 'general' ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="border-b border-content-border">
                    <CardTitle>Project Information</CardTitle>
                    <CardDescription>Basic project details and metadata</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className={sectionClasses}>
                      <Label className={fieldLabelClasses}>Project Name</Label>
                      <Input
                        value={projectForm.name}
                        onChange={(event) =>
                          setProjectForm({ ...projectForm, name: event.target.value })
                        }
                        data-ai-component="project.project-settings.general.name"
                        data-ai-action="project.project-settings.general.name.change"
                        data-ai-role="input"
                      />
                    </div>

                    <div className={sectionClasses}>
                      <Label className={fieldLabelClasses}>Description</Label>
                      <Textarea
                        value={projectForm.description}
                        onChange={(event) =>
                          setProjectForm({ ...projectForm, description: event.target.value })
                        }
                        rows={4}
                        data-ai-component="project.project-settings.general.description"
                        data-ai-action="project.project-settings.general.description.change"
                        data-ai-role="input"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className={sectionClasses}>
                        <Label className={fieldLabelClasses}>Type</Label>
                        <NativeSelect
                          value={projectForm.type}
                          onChange={(event) =>
                            setProjectForm({
                              ...projectForm,
                              type: event.target.value as ProjectType,
                            })
                          }
                          data-ai-component="project.project-settings.general.type"
                          data-ai-action="project.project-settings.general.type.change"
                          data-ai-role="select"
                        >
                          <NativeSelectOption value="personal">Personal</NativeSelectOption>
                          <NativeSelectOption value="team">Team</NativeSelectOption>
                          <NativeSelectOption value="experiment">Experiment</NativeSelectOption>
                          <NativeSelectOption value="enterprise">Enterprise</NativeSelectOption>
                        </NativeSelect>
                      </div>

                      <div className={sectionClasses}>
                        <Label className={fieldLabelClasses}>Visibility</Label>
                        <NativeSelect
                          value={projectForm.visibility}
                          onChange={(event) =>
                            setProjectForm({
                              ...projectForm,
                              visibility: event.target.value as ProjectVisibility,
                            })
                          }
                          data-ai-component="project.project-settings.general.visibility"
                          data-ai-action="project.project-settings.general.visibility.change"
                          data-ai-role="select"
                        >
                          <NativeSelectOption value="private">Private</NativeSelectOption>
                          <NativeSelectOption value="internal">Internal</NativeSelectOption>
                          <NativeSelectOption value="public">Public</NativeSelectOption>
                        </NativeSelect>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveProject}
                        disabled={isSaving}
                        data-ai-component="project.project-settings.general.save"
                        data-ai-action="project.project-settings.general.save.click"
                        data-ai-role="submit"
                      >
                        {isSaving ? 'Saving...' : 'Save Project Info'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-content-border">
                    <CardTitle>Git Tool Status</CardTitle>
                    <CardDescription>Check Git tool availability and configuration</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <GitToolStatus />
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeTab === 'git' ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="border-b border-content-border">
                    <CardTitle>Workspace Configuration</CardTitle>
                    <CardDescription>Configure workspace directory and remote repository</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <WorkspaceConfig projectId={projectId} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-content-border">
                    <CardTitle>Git Repositories</CardTitle>
                    <CardDescription>Manage repositories associated with this project</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <RepositoryList projectId={projectId} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-content-border">
                    <CardTitle>Git Configuration</CardTitle>
                    <CardDescription>Project-specific Git settings</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className={sectionClasses}>
                      <Label className={fieldLabelClasses}>Default Branch</Label>
                      <Input
                        value={gitConfig.defaultBranch}
                        onChange={(event) =>
                          setGitConfig({ ...gitConfig, defaultBranch: event.target.value })
                        }
                        placeholder="main"
                        data-ai-component="project.project-settings.git.default-branch"
                        data-ai-action="project.project-settings.git.default-branch.change"
                        data-ai-role="input"
                      />
                    </div>

                    <div className={sectionClasses}>
                      <Label className={fieldLabelClasses}>Commit Message Template</Label>
                      <Textarea
                        value={gitConfig.commitTemplate}
                        onChange={(event) =>
                          setGitConfig({ ...gitConfig, commitTemplate: event.target.value })
                        }
                        rows={3}
                        placeholder="e.g., [TASK-{id}] {description}"
                        data-ai-component="project.project-settings.git.commit-template"
                        data-ai-action="project.project-settings.git.commit-template.change"
                        data-ai-role="input"
                      />
                    </div>

                    <div className={sectionClasses}>
                      <Label className={fieldLabelClasses}>Branch Naming Convention</Label>
                      <Input
                        value={gitConfig.branchNaming}
                        onChange={(event) =>
                          setGitConfig({ ...gitConfig, branchNaming: event.target.value })
                        }
                        placeholder="e.g., feature/{task-id}-{description}"
                        data-ai-component="project.project-settings.git.branch-naming"
                        data-ai-action="project.project-settings.git.branch-naming.change"
                        data-ai-role="input"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className={sectionClasses}>
                        <Label className={fieldLabelClasses}>Default Working Directory</Label>
                        <Input
                          value={terminalConfig.defaultCwd}
                          onChange={(event) =>
                            setTerminalConfig({ ...terminalConfig, defaultCwd: event.target.value })
                          }
                          placeholder="Leave empty to use project root"
                          data-ai-component="project.project-settings.terminal.default-cwd"
                          data-ai-action="project.project-settings.terminal.default-cwd.change"
                          data-ai-role="input"
                        />
                      </div>

                      <div className={sectionClasses}>
                        <Label className={fieldLabelClasses}>Default Shell</Label>
                        <NativeSelect
                          value={terminalConfig.defaultShell}
                          onChange={(event) =>
                            setTerminalConfig({
                              ...terminalConfig,
                              defaultShell: event.target.value,
                            })
                          }
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
                      </div>
                    </div>

                    <div className={sectionClasses}>
                      <Label className={fieldLabelClasses}>Environment Variables (JSON)</Label>
                      <Textarea
                        value={terminalConfig.env}
                        onChange={(event) =>
                          setTerminalConfig({ ...terminalConfig, env: event.target.value })
                        }
                        rows={4}
                        placeholder='{"NODE_ENV":"development"}'
                        data-ai-component="project.project-settings.terminal.env"
                        data-ai-action="project.project-settings.terminal.env.change"
                        data-ai-role="input"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveConfig}
                        disabled={isSaving}
                        data-ai-component="project.project-settings.git.save"
                        data-ai-action="project.project-settings.git.save.click"
                        data-ai-role="submit"
                      >
                        {isSaving ? 'Saving...' : 'Save Git & Terminal'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {activeTab === 'cloud' ? (
              <Card>
                <CardHeader className="border-b border-content-border">
                  <CardTitle>Cloud Project Synchronization</CardTitle>
                  <CardDescription>Link and sync with GitHub Projects, Linear, or Jira</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ExternalLinksManager projectId={projectId} />
                </CardContent>
              </Card>
            ) : null}

            {activeTab === 'docs' ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="border-b border-content-border">
                    <CardTitle>External Documentation</CardTitle>
                    <CardDescription>Link to Notion, Confluence, Google Docs, etc.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <DocLinksManager projectId={projectId} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="border-b border-content-border">
                    <CardTitle>API Documentation</CardTitle>
                    <CardDescription>Link to Swagger, Apifox, Postman, etc.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ApiDocLinksManager projectId={projectId} />
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>

          <AttentionRail
            aiPrefix="project.project-settings"
            items={[
              {
                id: 'project-dashboard',
                title: '返回项目仪表盘',
                description: '查看健康度、风险与近期动态',
                to: `/app/projects/${projectId}/dashboard`,
              },
              {
                id: 'workspace-repositories',
                title: '进入仓库总览',
                description: '集中管理仓库状态与连接',
                to: '/app/repositories',
              },
              {
                id: 'workspace-integrations',
                title: '进入集成中心',
                description: '统一调整外部工具接入',
                to: '/app/integrations',
              },
            ]}
          />
        </section>
      </div>
    </PageShell>
  );
}
