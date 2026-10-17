/**
 * 引导「环境检查」步骤（2026-10-03 改版切片；2026-10-11 七步统一批起双端共用）。
 *
 * 聚合 GET /environment 六项检测（node/git/claude-code/codex/zcode/opencode）：
 * 已装显版本；未装给平台对应安装命令（复制）+ 官方下载链接 + 重新检测。
 * 诚实化原则延续：Ordo 只检测+指引，不代装环境；步骤可跳过、不设门禁，
 * 检测结果不影响引导完成流程。检测走 server 端点，web/桌面天然同源。
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Copy,
  ExternalLink,
  GitBranch,
  Hexagon,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getProviderMeta } from '@/shared/ai-providers/provider-meta';
import { cn } from '@/lib/utils';
import {
  onboardingApi,
  type EnvironmentToolInfo,
} from '../api/onboarding-api';

type Platform = 'windows' | 'macos' | 'linux';

function detectPlatform(): Platform {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/Win/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'macos';
  return 'linux';
}

interface ToolMeta {
  /** 展示名（专有名词不翻译，与设置→AI 管理 tools-tab 口径一致） */
  name: string;
  /** AI CLI 品牌图标（provider-meta 唯一源）；node/git 用 lucide 通用图标 */
  brandProviderId?: 'claude-code' | 'codex' | 'zcode' | 'opencode';
  lucideIcon?: typeof GitBranch;
  /** 平台安装命令（缺平台键 = 该平台无收录命令，不臆造） */
  commands?: Partial<Record<Platform, string>>;
  /** 全平台统一命令（npm 系），优先于平台命令 */
  universalCommand?: string;
  /** 官方下载/文档链接（无把握的渠道不编造，如 zcode） */
  link?: string;
  /** 安装依赖 Node.js（npm 系 CLI）——node 未装时提示先装 node */
  requiresNode?: boolean;
}

const TOOL_META: Record<string, ToolMeta> = {
  node: {
    name: 'Node.js',
    lucideIcon: Hexagon,
    commands: {
      windows: 'winget install OpenJS.NodeJS.LTS',
      macos: 'brew install node',
      linux: 'sudo apt install nodejs npm',
    },
    link: 'https://nodejs.org/en/download',
  },
  git: {
    name: 'Git',
    lucideIcon: GitBranch,
    commands: {
      windows: 'winget install --id Git.Git -e',
      macos: 'brew install git',
      linux: 'sudo apt install git',
    },
    link: 'https://git-scm.com/downloads',
  },
  'claude-code': {
    name: 'Claude Code',
    brandProviderId: 'claude-code',
    universalCommand: 'npm install -g @anthropic-ai/claude-code',
    link: 'https://docs.anthropic.com/en/docs/claude-code/overview',
    requiresNode: true,
  },
  codex: {
    name: 'Codex CLI',
    brandProviderId: 'codex',
    universalCommand: 'npm install -g @openai/codex',
    link: 'https://developers.openai.com/codex',
    requiresNode: true,
  },
  zcode: {
    name: 'ZCode CLI',
    brandProviderId: 'zcode',
    // 与 settings→AI 管理 tools-tab INSTALL_HINTS 同源：zcode 无公开 npm 包名，不臆造命令与链接
    universalCommand: 'zcode',
  },
  opencode: {
    name: 'OpenCode',
    brandProviderId: 'opencode',
    universalCommand: 'npm install -g opencode-ai',
    link: 'https://opencode.ai/docs',
    requiresNode: true,
  },
};

const TOOL_ORDER = ['node', 'git', 'claude-code', 'codex', 'zcode', 'opencode'];

function ToolIcon({ meta, size = 16 }: { meta: ToolMeta; size?: number }) {
  if (meta.brandProviderId) {
    const brandMeta = getProviderMeta(meta.brandProviderId);
    const BrandIcon = brandMeta.Color ?? brandMeta.Icon;
    return <BrandIcon size={size} />;
  }
  const Icon = meta.lucideIcon;
  return Icon ? <Icon className="shrink-0" style={{ width: size, height: size }} /> : null;
}

function EnvironmentToolCard({
  tool,
  nodeInstalled,
}: {
  tool?: EnvironmentToolInfo;
  nodeInstalled: boolean;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const meta = TOOL_META[tool?.key ?? ''] ?? { name: tool?.key ?? '' };
  const platform = useMemo(() => detectPlatform(), []);
  const installed = tool?.installed === true;
  const detectionUnavailable = !installed && tool?.error === 'Detection unavailable';
  const installCommand =
    meta.universalCommand ?? meta.commands?.[platform] ?? null;

  const handleCopy = async () => {
    if (!installCommand) return;
    try {
      await navigator.clipboard.writeText(installCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 剪贴板不可用（非安全上下文等）：静默，按钮文案不变
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/20 p-3" data-testid={`env-tool-${tool?.key}`}>
      <div className="flex items-center gap-2">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background">
          <ToolIcon meta={meta} />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{meta.name}</span>
        {installed ? (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent-green">
            <CheckCircle className="size-3.5" />
            {t('onboarding.environment.installed')}
          </span>
        ) : detectionUnavailable ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            {t('onboarding.environment.unknown')}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-accent-red">
            <XCircle className="size-3.5" />
            {t('onboarding.environment.notInstalled')}
          </span>
        )}
      </div>

      {installed && tool?.version ? (
        <p className="pl-9 font-mono text-3xs text-muted-foreground">{tool.version}</p>
      ) : null}
      {!installed && !detectionUnavailable && installCommand ? (
        <div className="space-y-1.5 pl-9">
          {meta.requiresNode && !nodeInstalled ? (
            <p className="text-3xs text-accent-yellow">
              {t('onboarding.environment.requiresNode')}
            </p>
          ) : null}
          <div className="flex items-center gap-1.5">
            <code className="min-w-0 flex-1 truncate rounded bg-muted/60 px-2 py-1 font-mono text-3xs">
              {installCommand}
            </code>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 shrink-0 px-1.5 text-3xs"
              onClick={() => void handleCopy()}
            >
              <Copy className="mr-0.5 size-3" />
              {copied ? t('onboarding.environment.copied') : t('onboarding.environment.copy')}
            </Button>
            {meta.link ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 shrink-0 px-1.5 text-3xs"
                onClick={() => window.open(meta.link, '_blank', 'noopener')}
              >
                <ExternalLink className="mr-0.5 size-3" />
                {t('onboarding.environment.officialSite')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
      {!installed && !detectionUnavailable && !installCommand && tool?.error ? (
        <p className="pl-9 text-3xs text-muted-foreground" title={tool.error}>
          {tool.error}
        </p>
      ) : null}
    </div>
  );
}

export function EnvironmentStep() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['environment'],
    queryFn: onboardingApi.getEnvironment,
  });

  const tools = useMemo(() => query.data?.tools ?? [], [query.data]);
  const byKey = useMemo(
    () => new Map(tools.map((tool) => [tool.key, tool])),
    [tools],
  );
  const nodeInstalled = byKey.get('node')?.installed === true;

  return (
    <div className="space-y-6">
      <DialogHeader>
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <Hexagon className="h-7 w-7 text-primary" />
        </div>
        <DialogTitle className="text-center text-xl">
          {t('onboarding.environment.heading')}
        </DialogTitle>
        <DialogDescription className="text-center">
          {t('onboarding.environment.description')}
        </DialogDescription>
      </DialogHeader>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {query.isFetching
            ? t('onboarding.environment.checking')
            : t('onboarding.environment.toolCount', { count: tools.length })}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className={cn('mr-1 h-3.5 w-3.5', query.isFetching && 'animate-spin')} />
          {t('onboarding.environment.recheck')}
        </Button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {TOOL_ORDER.map((key) => (
          <EnvironmentToolCard
            key={key}
            tool={byKey.get(key)}
            nodeInstalled={nodeInstalled}
          />
        ))}
      </div>

      <p className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
        {t('onboarding.environment.installHint')}
      </p>
    </div>
  );
}
