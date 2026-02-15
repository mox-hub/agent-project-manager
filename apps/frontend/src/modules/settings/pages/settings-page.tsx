import { useState, useEffect } from 'react';
import { useGlobalConfig, useUpdateGlobalConfig } from '@/modules/config/hooks/use-global-config';
import { Card } from '@/shared/ui/card';
import { PillButton } from '@/shared/ui/button';
import { colors, spacing, typography } from '@/shared/theme/tokens';

export function SettingsPage() {
  const { data: config = {}, isLoading } = useGlobalConfig();
  const updateConfig = useUpdateGlobalConfig();
  const [isSaving, setIsSaving] = useState(false);

  // Git configuration state
  const [gitConfig, setGitConfig] = useState({
    defaultProvider: 'github',
    defaultBranch: 'main',
    userName: '',
    userEmail: '',
    sshKeyPath: '',
    autoSync: true,
    diffShowWhitespace: false,
  });

  // Terminal configuration state
  const [terminalConfig, setTerminalConfig] = useState({
    defaultShell: 'pwsh',
    defaultCwd: '',
    theme: 'default',
    historySize: 1000,
    autoSaveOutput: false,
    aiDiagnostics: true,
  });

  // Update local state when config loads
  useEffect(() => {
    if (!isLoading && Object.keys(config).length > 0) {
      setGitConfig({
        defaultProvider: config['git.defaultProvider'] || 'github',
        defaultBranch: config['git.defaultBranch'] || 'main',
        userName: config['git.user.name'] || '',
        userEmail: config['git.user.email'] || '',
        sshKeyPath: config['git.sshKeyPath'] || '',
        autoSync: config['git.autoSync'] ?? true,
        diffShowWhitespace: config['git.diff.showWhitespace'] ?? false,
      });
      setTerminalConfig({
        defaultShell: config['terminal.defaultShell'] || 'pwsh',
        defaultCwd: config['terminal.defaultCwd'] || '',
        theme: config['terminal.theme'] || 'default',
        historySize: config['terminal.historySize'] || 1000,
        autoSaveOutput: config['terminal.autoSaveOutput'] ?? false,
        aiDiagnostics: config['terminal.aiDiagnostics'] ?? true,
      });
    }
  }, [config, isLoading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        'git.defaultProvider': gitConfig.defaultProvider,
        'git.defaultBranch': gitConfig.defaultBranch,
        'git.user.name': gitConfig.userName,
        'git.user.email': gitConfig.userEmail,
        'git.sshKeyPath': gitConfig.sshKeyPath,
        'git.autoSync': gitConfig.autoSync,
        'git.diff.showWhitespace': gitConfig.diffShowWhitespace,
        'terminal.defaultShell': terminalConfig.defaultShell,
        'terminal.defaultCwd': terminalConfig.defaultCwd,
        'terminal.theme': terminalConfig.theme,
        'terminal.historySize': terminalConfig.historySize,
        'terminal.autoSaveOutput': terminalConfig.autoSaveOutput,
        'terminal.aiDiagnostics': terminalConfig.aiDiagnostics,
      });
    } finally {
      setIsSaving(false);
    }
  };

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
        maxWidth: 900,
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
          Settings
        </h1>
        <p
          style={{
            fontSize: typography.sm,
            color: colors.textSecondary,
            marginTop: spacing.xs,
            marginBottom: 0,
          }}
        >
          Configure global Git and Terminal settings
        </p>
      </header>

      <Card
        title="Git Configuration"
        description="Configure default Git settings that apply across all projects"
      >
        <div style={sectionStyle}>
          <label style={labelStyle}>Default Provider</label>
          <select
            value={gitConfig.defaultProvider}
            onChange={(e) =>
              setGitConfig({ ...gitConfig, defaultProvider: e.target.value })
            }
            style={inputStyle}
          >
            <option value="github">GitHub</option>
            <option value="gitlab">GitLab</option>
            <option value="gitea">Gitea</option>
            <option value="local">Local</option>
          </select>
        </div>

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
          <label style={labelStyle}>User Name</label>
          <input
            type="text"
            value={gitConfig.userName}
            onChange={(e) =>
              setGitConfig({ ...gitConfig, userName: e.target.value })
            }
            placeholder="Your Git user name"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>User Email</label>
          <input
            type="email"
            value={gitConfig.userEmail}
            onChange={(e) =>
              setGitConfig({ ...gitConfig, userEmail: e.target.value })
            }
            placeholder="your.email@example.com"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>SSH Key Path</label>
          <input
            type="text"
            value={gitConfig.sshKeyPath}
            onChange={(e) =>
              setGitConfig({ ...gitConfig, sshKeyPath: e.target.value })
            }
            placeholder="~/.ssh/id_rsa"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label
            style={{
              ...labelStyle,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={gitConfig.autoSync}
              onChange={(e) =>
                setGitConfig({ ...gitConfig, autoSync: e.target.checked })
              }
              style={{ cursor: 'pointer' }}
            />
            Enable automatic Git sync
          </label>
        </div>

        <div style={sectionStyle}>
          <label
            style={{
              ...labelStyle,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={gitConfig.diffShowWhitespace}
              onChange={(e) =>
                setGitConfig({
                  ...gitConfig,
                  diffShowWhitespace: e.target.checked,
                })
              }
              style={{ cursor: 'pointer' }}
            />
            Show whitespace changes in diff
          </label>
        </div>
      </Card>

      <Card
        title="Terminal Configuration"
        description="Configure default Terminal settings"
      >
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
            <option value="pwsh">PowerShell (pwsh)</option>
            <option value="bash">Bash</option>
            <option value="zsh">Zsh</option>
            <option value="cmd">CMD (Windows)</option>
          </select>
        </div>

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
            placeholder="Leave empty to use project directory"
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Theme</label>
          <select
            value={terminalConfig.theme}
            onChange={(e) =>
              setTerminalConfig({ ...terminalConfig, theme: e.target.value })
            }
            style={inputStyle}
          >
            <option value="default">Default</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="monokai">Monokai</option>
          </select>
        </div>

        <div style={sectionStyle}>
          <label style={labelStyle}>Command History Size</label>
          <input
            type="number"
            value={terminalConfig.historySize}
            onChange={(e) =>
              setTerminalConfig({
                ...terminalConfig,
                historySize: parseInt(e.target.value) || 1000,
              })
            }
            min={100}
            max={10000}
            style={inputStyle}
          />
        </div>

        <div style={sectionStyle}>
          <label
            style={{
              ...labelStyle,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={terminalConfig.autoSaveOutput}
              onChange={(e) =>
                setTerminalConfig({
                  ...terminalConfig,
                  autoSaveOutput: e.target.checked,
                })
              }
              style={{ cursor: 'pointer' }}
            />
            Automatically save command output
          </label>
        </div>

        <div style={sectionStyle}>
          <label
            style={{
              ...labelStyle,
              display: 'flex',
              alignItems: 'center',
              gap: spacing.sm,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={terminalConfig.aiDiagnostics}
              onChange={(e) =>
                setTerminalConfig({
                  ...terminalConfig,
                  aiDiagnostics: e.target.checked,
                })
              }
              style={{ cursor: 'pointer' }}
            />
            Enable AI diagnostics for terminal errors
          </label>
        </div>
      </Card>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: spacing.md,
          marginTop: spacing.xl,
        }}
      >
        <PillButton
          variant="primary"
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </PillButton>
      </div>
    </div>
  );
}
