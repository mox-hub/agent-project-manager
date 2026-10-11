/**
 * 引导「环境检查」步骤测试（2026-10-03 改版切片）：
 * - 三态渲染：已装（版本）/ 未装（安装命令+复制+官方下载）/ 探测降级（unknown，无指引）；
 * - npm 系 CLI 在 node 未装时提示先装 Node（requiresNode）；
 * - 复制命令走 navigator.clipboard；重新检测触发二次请求。
 * i18n mock 透传键名（断言直接对着键写）；provider-meta mock 掉 lobehub 原生 ESM（仓库既有坑）。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider, type DehydratedState } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EnvironmentStep } from './environment-step';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/shared/ai-providers/provider-meta', () => ({
  getProviderMeta: (id: string) => ({
    label: id,
    Icon: function MockBrandIcon() {
      return <span data-testid={`brand-${id}`} />;
    },
    Color: undefined,
  }),
}));

const getEnvironmentMock = vi.hoisted(() => vi.fn());

vi.mock('../api/onboarding-api', () => ({
  onboardingApi: {
    getEnvironment: (...args: unknown[]) => getEnvironmentMock(...args),
  },
}));

const allTools = [
  { key: 'node', installed: true, version: 'v22.14.0', error: null },
  { key: 'git', installed: true, version: 'git version 2.47.0', error: null },
  {
    key: 'claude-code',
    installed: false,
    version: null,
    error: 'Command not found or failed to execute',
  },
  { key: 'codex', installed: false, version: null, error: 'Detection unavailable' },
  { key: 'zcode', installed: false, version: null, error: null },
  { key: 'opencode', installed: true, version: '1.2.3', error: null },
];

function renderStep(): { baseElement: HTMLElement } {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode; dehydratedState?: DehydratedState }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  // EnvironmentStep 消费 DialogHeader/Title/Description（base-ui 需 Dialog.Root 上下文）——
  // 独立渲染时补最小 Dialog 包裹，与 wizard 挂载形态一致
  const utils = render(
    <Dialog open>
      <DialogContent>
        <EnvironmentStep />
      </DialogContent>
    </Dialog>,
    { wrapper },
  );
  return { baseElement: utils.baseElement };
}

beforeEach(() => {
  getEnvironmentMock.mockReset();
  getEnvironmentMock.mockResolvedValue({ tools: allTools, checkedAt: '2026-10-03T00:00:00Z' });
});

describe('EnvironmentStep（引导环境检查）', () => {
  it('三态渲染：已装显版本 / 未装给安装命令+官方下载 / 探测降级只显 unknown 无指引', async () => {
    const { baseElement } = renderStep();

    // 已装：node 卡显就绪徽注 + 版本
    await screen.findByTestId('env-tool-node');
    const nodeCard = screen.getByTestId('env-tool-node');
    expect(nodeCard.textContent).toContain('onboarding.environment.installed');
    expect(baseElement.textContent).toContain('v22.14.0');

    // 未装：claude-code 给 universal 命令 + 官方下载按钮
    const claudeCard = screen.getByTestId('env-tool-claude-code');
    expect(claudeCard.textContent).toContain('onboarding.environment.notInstalled');
    expect(claudeCard.textContent).toContain('npm install -g @anthropic-ai/claude-code');
    expect(claudeCard.textContent).toContain('onboarding.environment.officialSite');

    // 探测降级（Detection unavailable）：unknown 文案，不给安装指引
    const codexCard = screen.getByTestId('env-tool-codex');
    expect(codexCard.textContent).toContain('onboarding.environment.unknown');
    expect(codexCard.textContent).not.toContain('npm install');

    // zcode 无收录的官方下载渠道（不臆造链接）：有命令、无官方下载按钮
    const zcodeCard = screen.getByTestId('env-tool-zcode');
    expect(zcodeCard.textContent).toContain('zcode');
    expect(zcodeCard.textContent).not.toContain('onboarding.environment.officialSite');
  });

  it('node 未装时 npm 系 CLI 卡提示先装 Node（requiresNode）', async () => {
    getEnvironmentMock.mockResolvedValue({
      tools: allTools.map((tool) =>
        tool.key === 'node' ? { ...tool, installed: false, version: null } : tool,
      ),
      checkedAt: '2026-10-03T00:00:00Z',
    });
    renderStep();

    await screen.findByTestId('env-tool-claude-code');
    const claudeCard = screen.getByTestId('env-tool-claude-code');
    expect(claudeCard.textContent).toContain('onboarding.environment.requiresNode');
    // node 自身也给平台安装命令（平台分支随运行环境而定，断言命令元素存在即可）
    const nodeCard = screen.getByTestId('env-tool-node');
    expect(nodeCard.querySelector('code')).toBeTruthy();
  });

  it('复制命令走 navigator.clipboard；重新检测触发二次请求', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderStep();

    await screen.findByTestId('env-tool-claude-code');
    const claudeCard = screen.getByTestId('env-tool-claude-code');
    fireEvent.click(claudeCard.querySelector('button[type="button"]') as HTMLElement);
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('npm install -g @anthropic-ai/claude-code');
    });

    expect(getEnvironmentMock).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('onboarding.environment.recheck'));
    await waitFor(() => {
      expect(getEnvironmentMock).toHaveBeenCalledTimes(2);
    });
  });
});
