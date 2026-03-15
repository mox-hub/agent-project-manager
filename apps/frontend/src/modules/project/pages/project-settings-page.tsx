import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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
import { Textarea } from '@/components/ui/textarea';
import type { ProjectType, ProjectVisibility } from '../api/project-api';
import { ProjectDetailNav } from '../components/dashboard/project-detail-nav';

type SettingsTab = 'general' | 'git' | 'cloud' | 'docs' | 'terminal';

const inputClasses = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm";
const labelClasses = "block mb-1 text-sm text-muted-foreground font-medium";
const sectionClasses = "mb-6";

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
    if (project) {
      setProjectForm({
        name: project.name,
        description: project.description || '',
        type: project.type,
        visibility: project.visibility,
      });
    }
  }, [project]);

  useEffect(() => {
    if (!configLoading && Object.keys(config).length > 0) {
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
    }
  }, [config, configLoading]);

  const [isSaving, setIsSaving] = useState(false);

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
    return <div className="text-muted-foreground">Loading...</div>;
  }

  const tabs: { id: SettingsTab; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'git', label: 'Git & Terminal', icon: '🔧' },
    { id: 'cloud', label: 'Cloud Sync', icon: '☁️' },
    { id: 'docs', label: 'Documentation', icon: '📚' },
  ];

  return (
    <div className="p-8 text-foreground" style={{ maxWidth: 1200, margin: '0 auto' }}>
      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-xl font-semibold m-0">Project Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure project-specific settings and integrations
        </p>
      </header>
      <ProjectDetailNav projectId={projectId} />

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-8 border-b border-border pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-md border-none cursor-pointer text-sm font-medium flex items-center gap-2 transition-all ${
              activeTab === tab.id
                ? 'bg-primary/10 text-primary'
                : 'bg-transparent text-muted-foreground hover:bg-muted'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>Basic project details and metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={sectionClasses}>
                <Label className={labelClasses}>Project Name</Label>
                <Input
                  type="text"
                  value={projectForm.name}
                  onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                  className={inputClasses}
                />
              </div>

              <div className={sectionClasses}>
                <Label className={labelClasses}>Description</Label>
                <Textarea
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  rows={3}
                  className={inputClasses}
                />
              </div>

              <div className={sectionClasses}>
                <Label className={labelClasses}>Type</Label>
                <select
                  className={inputClasses}
                  value={projectForm.type}
                  onChange={(e) => setProjectForm({ ...projectForm, type: e.target.value as ProjectType })}
                >
                  <option value="personal">Personal</option>
                  <option value="team">Team</option>
                  <option value="experiment">Experiment</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className={sectionClasses}>
                <Label className={labelClasses}>Visibility</Label>
                <select
                  className={inputClasses}
                  value={projectForm.visibility}
                  onChange={(e) => setProjectForm({ ...projectForm, visibility: e.target.value as ProjectVisibility })}
                >
                  <option value="private">Private</option>
                  <option value="internal">Internal</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 mt-4">
                <Button onClick={handleSaveProject} disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Project Info'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Git Tool Status</CardTitle>
                <CardDescription>Check Git tool availability and configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <GitToolStatus />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Git Tab */}
      {activeTab === 'git' && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Workspace Configuration</CardTitle>
              <CardDescription>Configure project workspace directory and remote repository</CardDescription>
            </CardHeader>
            <CardContent>
              <WorkspaceConfig projectId={projectId} />
            </CardContent>
          </Card>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Git Repositories</CardTitle>
                <CardDescription>Manage Git repositories associated with this project</CardDescription>
              </CardHeader>
              <CardContent>
                <RepositoryList projectId={projectId} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Git Configuration</CardTitle>
                <CardDescription>Project-specific Git settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={sectionClasses}>
                  <Label className={labelClasses}>Default Branch</Label>
                  <Input
                    type="text"
                    value={gitConfig.defaultBranch}
                    onChange={(e) => setGitConfig({ ...gitConfig, defaultBranch: e.target.value })}
                    placeholder="main"
                    className={inputClasses}
                  />
                </div>

                <div className={sectionClasses}>
                  <Label className={labelClasses}>Commit Message Template</Label>
                  <Textarea
                    value={gitConfig.commitTemplate}
                    onChange={(e) => setGitConfig({ ...gitConfig, commitTemplate: e.target.value })}
                    rows={4}
                    placeholder="e.g., [TASK-{id}] {description}"
                    className={inputClasses}
                  />
                </div>

                <div className={sectionClasses}>
                  <Label className={labelClasses}>Branch Naming Convention</Label>
                  <Input
                    type="text"
                    value={gitConfig.branchNaming}
                    onChange={(e) => setGitConfig({ ...gitConfig, branchNaming: e.target.value })}
                    placeholder="e.g., feature/{task-id}-{description}"
                    className={inputClasses}
                  />
                </div>

                <div className="flex justify-end gap-4 mt-4">
                  <Button onClick={handleSaveConfig} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Terminal Configuration</CardTitle>
                <CardDescription>Project-specific Terminal settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={sectionClasses}>
                  <Label className={labelClasses}>Default Working Directory</Label>
                  <Input
                    type="text"
                    value={terminalConfig.defaultCwd}
                    onChange={(e) => setTerminalConfig({ ...terminalConfig, defaultCwd: e.target.value })}
                    placeholder="Leave empty to use project root"
                    className={inputClasses}
                  />
                </div>

                <div className={sectionClasses}>
                  <Label className={labelClasses}>Default Shell</Label>
                  <select
                    className={inputClasses}
                    value={terminalConfig.defaultShell}
                    onChange={(e) => setTerminalConfig({ ...terminalConfig, defaultShell: e.target.value })}
                  >
                    <option value="">Use global default</option>
                    <option value="pwsh">PowerShell (pwsh)</option>
                    <option value="bash">Bash</option>
                    <option value="zsh">Zsh</option>
                    <option value="cmd">CMD (Windows)</option>
                  </select>
                </div>

                <div className={sectionClasses}>
                  <Label className={labelClasses}>Environment Variables (JSON)</Label>
                  <Textarea
                    value={terminalConfig.env}
                    onChange={(e) => setTerminalConfig({ ...terminalConfig, env: e.target.value })}
                    rows={4}
                    placeholder='{"NODE_ENV": "development"}'
                    className={inputClasses}
                  />
                </div>

                <div className="flex justify-end gap-4 mt-4">
                  <Button onClick={handleSaveConfig} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Terminal Config'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Cloud Sync Tab */}
      {activeTab === 'cloud' && (
        <Card>
          <CardHeader>
            <CardTitle>Cloud Project Synchronization</CardTitle>
            <CardDescription>Link and sync with GitHub Projects, Linear, or Jira</CardDescription>
          </CardHeader>
          <CardContent>
            <ExternalLinksManager projectId={projectId} />
          </CardContent>
        </Card>
      )}

      {/* Documentation Tab */}
      {activeTab === 'docs' && (
        <div className="flex flex-col gap-8">
          <Card>
            <CardHeader>
              <CardTitle>External Documentation</CardTitle>
              <CardDescription>Link to Notion, Confluence, Google Docs, etc.</CardDescription>
            </CardHeader>
            <CardContent>
              <DocLinksManager projectId={projectId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>Link to Swagger, Apifox, Postman, etc.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApiDocLinksManager projectId={projectId} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
