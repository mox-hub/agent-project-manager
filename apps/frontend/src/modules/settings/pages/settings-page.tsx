import { useState, useEffect } from 'react';
import { useGlobalConfig, useUpdateGlobalConfig } from '@/modules/config/hooks/use-global-config';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

  const inputClasses = "w-full px-3 py-2 rounded-md border border-input bg-background text-sm";

  const labelClasses = "block mb-1 text-sm text-muted-foreground font-medium";

  const sectionClasses = "mb-6";

  return (
    <div className="p-8 text-foreground" style={{ maxWidth: 900, margin: '0 auto' }}>
      <header className="mb-8 border-b border-border pb-4">
        <h1 className="text-xl font-semibold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure global Git and Terminal settings
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Git Configuration</CardTitle>
          <CardDescription>Configure default Git settings that apply across all projects</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={sectionClasses}>
            <Label className={labelClasses}>Default Provider</Label>
            <select
              value={gitConfig.defaultProvider}
              onChange={(e) =>
                setGitConfig({ ...gitConfig, defaultProvider: e.target.value })
              }
              className={inputClasses}
            >
              <option value="github">GitHub</option>
              <option value="gitlab">GitLab</option>
              <option value="gitea">Gitea</option>
              <option value="local">Local</option>
          </select>
        </div>

        <div className={sectionClasses}>
            <Label className={labelClasses}>Default Branch</Label>
            <Input
              type="text"
              value={gitConfig.defaultBranch}
              onChange={(e) =>
                setGitConfig({ ...gitConfig, defaultBranch: e.target.value })
              }
              placeholder="main"
              className={inputClasses}
            />
        </div>

        <div className={sectionClasses}>
            <Label className={labelClasses}>User Name</Label>
            <Input
              type="text"
              value={gitConfig.userName}
              onChange={(e) =>
                setGitConfig({ ...gitConfig, userName: e.target.value })
              }
              placeholder="Your Git user name"
              className={inputClasses}
            />
        </div>

        <div className={sectionClasses}>
            <Label className={labelClasses}>User Email</Label>
            <Input
              type="email"
              value={gitConfig.userEmail}
              onChange={(e) =>
                setGitConfig({ ...gitConfig, userEmail: e.target.value })
              }
              placeholder="your.email@example.com"
              className={inputClasses}
            />
        </div>

        <div className={sectionClasses}>
            <Label className={labelClasses}>SSH Key Path</Label>
            <Input
              type="text"
              value={gitConfig.sshKeyPath}
              onChange={(e) =>
                setGitConfig({ ...gitConfig, sshKeyPath: e.target.value })
              }
              placeholder="~/.ssh/id_rsa"
              className={inputClasses}
            />
        </div>

        <div className={sectionClasses}>
          <Label className={labelClasses}>
            <input
              type="checkbox"
              checked={gitConfig.autoSync}
              onChange={(e) =>
                setGitConfig({ ...gitConfig, autoSync: e.target.checked })
              }
              className="mr-2"
            />
            Enable automatic Git sync
          </Label>
        </div>

        <div className={sectionClasses}>
          <Label className={labelClasses}>
            <input
              type="checkbox"
              checked={gitConfig.diffShowWhitespace}
              onChange={(e) =>
                setGitConfig({
                  ...gitConfig,
                  diffShowWhitespace: e.target.checked,
                })
              }
              className="mr-2"
            />
            Show whitespace changes in diff
          </Label>
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Terminal Configuration</CardTitle>
          <CardDescription>Configure default Terminal settings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={sectionClasses}>
          <Label className={labelClasses}>Default Shell</Label>
          <select
            value={terminalConfig.defaultShell}
            onChange={(e) =>
              setTerminalConfig({
                ...terminalConfig,
                defaultShell: e.target.value,
              })
            }
            className={inputClasses}
          >
            <option value="pwsh">PowerShell (pwsh)</option>
            <option value="bash">Bash</option>
            <option value="zsh">Zsh</option>
            <option value="cmd">CMD (Windows)</option>
          </select>
        </div>

        <div className={sectionClasses}>
          <Label className={labelClasses}>Default Working Directory</Label>
          <Input
            type="text"
            value={terminalConfig.defaultCwd}
            onChange={(e) =>
              setTerminalConfig({
                ...terminalConfig,
                defaultCwd: e.target.value,
              })
            }
            placeholder="Leave empty to use project directory"
            className={inputClasses}
          />
        </div>

        <div className={sectionClasses}>
          <Label className={labelClasses}>Theme</Label>
          <select
            value={terminalConfig.theme}
            onChange={(e) =>
              setTerminalConfig({ ...terminalConfig, theme: e.target.value })
            }
            className={inputClasses}
          >
            <option value="default">Default</option>
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="monokai">Monokai</option>
          </select>
        </div>

        <div className={sectionClasses}>
          <Label className={labelClasses}>Command History Size</Label>
          <Input
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
            className={inputClasses}
          />
        </div>

        <div className={sectionClasses}>
          <Label className={labelClasses}>
            <input
              type="checkbox"
              checked={terminalConfig.autoSaveOutput}
              onChange={(e) =>
                setTerminalConfig({
                  ...terminalConfig,
                  autoSaveOutput: e.target.checked,
                })
              }
              className="mr-2"
            />
            Automatically save command output
          </Label>
        </div>

        <div className={sectionClasses}>
          <Label className={labelClasses}>
            <input
              type="checkbox"
              checked={terminalConfig.aiDiagnostics}
              onChange={(e) =>
                setTerminalConfig({
                  ...terminalConfig,
                  aiDiagnostics: e.target.checked,
                })
              }
              className="mr-2"
            />
            Enable AI diagnostics for terminal errors
          </Label>
        </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4 mt-8">
        <Button
          onClick={handleSave}
          disabled={isSaving || isLoading}
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
