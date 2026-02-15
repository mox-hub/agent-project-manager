import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectDetail } from '../hooks/use-project-detail';
import { useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectConfig, useUpdateProjectConfig } from '@/modules/config/hooks/use-project-config';
import { RepositoryList } from '@/modules/git/components/repository-list';
import { Card } from '@/shared/ui/card';
import { PillButton } from '@/shared/ui/button';
import { colors, spacing, typography } from '@/shared/theme/tokens';
import type { ProjectType, ProjectVisibility } from '../api/project-api';

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

  // Initialize form when project loads
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

  // Initialize config when it loads
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
      const configToSave: Record<string, any> = {};
      if (gitConfig.defaultBranch) {
        configToSave['project.git.defaultBranch'] = gitConfig.defaultBranch;
      }
      if (gitConfig.commitTemplate) {
        configToSave['project.git.commitTemplate'] = gitConfig.commitTemplate;
      }
      if (gitConfig.branchNaming) {
        configToSave['project.git.branchNaming'] = gitConfig.branchNaming;
      }
      if (terminalConfig.defaultCwd) {
        configToSave['project.terminal.defaultCwd'] = terminalConfig.defaultCwd;
      }
      if (terminalConfig.defaultShell) {
        configToSave['project.terminal.defaultShell'] = terminalConfig.defaultShell;
      }
      if (terminalConfig.env) {
        try {
          configToSave['project.terminal.env'] = JSON.parse(terminalConfig.env);
        } catch {
          // If not valid JSON, store as string
          configToSave['project.terminal.env'] = terminalConfig.env;
        }
      }
      await updateConfig.mutateAsync(configToSave);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAll = async () => {
    await Promise.all([handleSaveProject(), handleSaveConfig()]);
  };

  if (projectLoading || !projectId) {
    return <div>Loading...</div>;
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: 6,
    border: `1px solid ${colors.borderStrong}`,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
    fontSize: typography.sm,
    fontFamily: 'inherit',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: spacing.xs,
    fontSize: typography.sm,
    color: colors.textSecondary,
    fontWeight: 500,
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: spacing.xl,
  };

  return (
    <div
      style={{
        padding: `${spacing.xl}px ${spacing.xl}px`,
        color: colors.textPrimary,
        maxWidth: 1000,
        margin: '0 auto',
      }}
    >
      <header
        style={{
          marginBottom: spacing.xl,
          borderBottom: `1px solid ${colors.borderSubtle}`,
          paddingBottom: spacing.md,
        }}
      >
        <h1
          style={{
            fontSize: typography.xl,
            fontWeight: 600,
            margin: 0,
            color: colors.textPrimary,
          }}
        >
          Project Settings
        </h1>
        <p
          style={{
            fontSize: typography.sm,
            color: colors.textSecondary,
            marginTop: spacing.xs,
            marginBottom: 0,
          }}
        >
          Configure project-specific settings and Git repositories
        </p>
      </header>

      <Card
        title="Project Information"
        description="Basic project details and metadata"
      >
        <div style={sectionStyle}>
          <label style={labelStyle}>Project Name</label>
          <input
            type="text"
            value={projectForm.name}
            onChange={(e) =>
              setProjectForm({ ...projectForm, name: e.target.value })
            }
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Description</label>
          <textarea
            value={projectForm.description}
            onChange={(e) =>
              setProjectForm({ ...projectForm, description: e.target.value })
            }
            rows={3}
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Type</label>
          <select
            value={projectForm.type}
            onChange={(e) =>
              setProjectForm({
                ...projectForm,
                type: e.target.value as ProjectType,
              })
            }
            style={inputStyle}
          >
            <option value="personal">Personal</option>
            <option value="team">Team</option>
            <option value="experiment">Experiment</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Visibility</label>
          <select
            value={projectForm.visibility}
            onChange={(e) =>
              setProjectForm({
                ...projectForm,
                visibility: e.target.value as ProjectVisibility,
              })
            }
            style={inputStyle}
          >
            <option value="private">Private</option>
            <option value="internal">Internal</option>
            <option value="public">Public</option>
          </select>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: spacing.md,
            marginTop: spacing.lg,
          }}
        >
          <PillButton
            variant="primary"
            onClick={handleSaveProject}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Project Info'}
          </PillButton>
        </div>
      </Card>

      <Card
        title="Git Repositories"
        description="Manage Git repositories associated with this project"
      >
        <RepositoryList projectId={projectId} />
      </Card>

      <Card
        title="Git Configuration"
        description="Project-specific Git settings"
      >
        <div style={sectionStyle}>
          <label style={labelStyle}>Default Branch</label>
          <input
            type="text"
            value={gitConfig.defaultBranch}
            onChange={(e) =>
              setGitConfig({ ...gitConfig, defaultBranch: e.target.value })
            }
            placeholder="main"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Commit Message Template</label>
          <textarea
            value={gitConfig.commitTemplate}
            onChange={(e) =>
              setGitConfig({ ...gitConfig, commitTemplate: e.target.value })
            }
            rows={4}
            placeholder="e.g., [TASK-{id}] {description}"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Branch Naming Convention</label>
          <input
            type="text"
            value={gitConfig.branchNaming}
            onChange={(e) =>
              setGitConfig({ ...gitConfig, branchNaming: e.target.value })
            }
            placeholder="e.g., feature/{task-id}-{description}"
            style={inputStyle}
          />
        </div>
      </Card>

      <Card
        title="Terminal Configuration"
        description="Project-specific Terminal settings"
      >
        <div style={sectionStyle}>
          <label style={labelStyle}>Default Working Directory</label>
          <input
            type="text"
            value={terminalConfig.defaultCwd}
            onChange={(e) =>
              setTerminalConfig({
                ...terminalConfig,
                defaultCwd: e.target.value,
              })
            }
            placeholder="Leave empty to use project root"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Default Shell</label>
          <select
            value={terminalConfig.defaultShell}
            onChange={(e) =>
              setTerminalConfig({
                ...terminalConfig,
                defaultShell: e.target.value,
              })
            }
            style={inputStyle}
          >
            <option value="">Use global default</option>
            <option value="pwsh">PowerShell (pwsh)</option>
            <option value="bash">Bash</option>
            <option value="zsh">Zsh</option>
            <option value="cmd">CMD (Windows)</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Environment Variables (JSON)</label>
          <textarea
            value={terminalConfig.env}
            onChange={(e) =>
              setTerminalConfig({ ...terminalConfig, env: e.target.value })
            }
            rows={4}
            placeholder='{"NODE_ENV": "development", "API_URL": "http://localhost:3000"}'
            style={inputStyle}
          />
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: spacing.md,
            marginTop: spacing.lg,
          }}
        >
          <PillButton
            variant="primary"
            onClick={handleSaveConfig}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </PillButton>
        </div>
      </Card>
    </div>
  );
}
