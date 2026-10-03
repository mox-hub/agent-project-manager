import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const settingsMutate = vi.fn();
const settingsData = {
  enabled: true,
  provider: 'opencode-go',
  model: 'jev-1.13-free',
  baseUrl: 'https://opencode.ai/zen/v1',
  timeoutMs: 8000,
  scenarios: { approval_risk: false } as Record<string, boolean>,
};

vi.mock('@/modules/ai-hub/hooks/use-quick-judge-settings', () => ({
  useQuickJudgeSettings: () => ({
    data: settingsData,
    isLoading: false,
  }),
  useUpdateQuickJudgeSettings: () => ({
    mutate: settingsMutate,
    isPending: false,
  }),
  useQuickJudgeLogs: () => ({
    data: {
      items: [
        {
          id: 'log1',
          scenario: 'approval_risk',
          model: 'jev-1.13-free',
          provider: 'opencode-go',
          promptTokens: 10,
          completionTokens: 0,
          totalTokens: 10,
          questions: 2,
          answers: {
            risk_level: { value: 'write', confidence: 0.9 },
            safe: { value: 0.44, confidence: null },
          },
          createdAt: new Date('2026-10-03T00:00:00Z').toISOString(),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    },
    isLoading: false,
  }),
}));

vi.mock('@/modules/auth/hooks/use-auth', () => ({
  useAuth: () => ({ isAdmin: true }),
}));

import { JudgmentTab } from './judgment-tab';

function renderTab() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <JudgmentTab />
    </QueryClientProvider>,
  );
}

// base-ui Switch 点击路径依赖 window.PointerEvent（jsdom 缺失）
beforeAll(() => {
  if (typeof (window as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
    (window as unknown as { PointerEvent: unknown }).PointerEvent = class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    };
  }
});

describe('JudgmentTab（判断介入管控面）', () => {
  beforeEach(() => {
    settingsMutate.mockClear();
    settingsData.scenarios = { approval_risk: false };
  });

  it('场景矩阵渲染：已禁用场景开关为关，其余为开（跟随总开关）', () => {
    renderTab();
    // approval_risk 显式 false → 开关 off；contract_drift 未配置 → on（跟随总开关）
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBeGreaterThanOrEqual(13);
    const approval = screen.getByRole('switch', { name: 'aiJudge.scenario.approval_risk.name' });
    expect(approval.getAttribute('data-checked')).toBeNull();
    const contract = screen.getByRole('switch', { name: 'aiJudge.scenario.contract_drift.name' });
    expect(contract).toHaveAttribute('data-checked');
  });

  it('打开被禁用场景 → PUT scenarios 增量合并（true=恢复跟随）', async () => {
    renderTab();
    const approval = screen.getByRole('switch', { name: 'aiJudge.scenario.approval_risk.name' });
    fireEvent.click(approval);
    await waitFor(() => {
      expect(settingsMutate).toHaveBeenCalledWith({ scenarios: { approval_risk: true } });
    });
  });

  it('关闭默认启用的场景 → PUT scenarios false（显式禁用）', async () => {
    renderTab();
    const contract = screen.getByRole('switch', { name: 'aiJudge.scenario.contract_drift.name' });
    fireEvent.click(contract);
    await waitFor(() => {
      expect(settingsMutate).toHaveBeenCalledWith({ scenarios: { contract_drift: false } });
    });
  });

  it('判定记录：渲染场景徽注（值+置信度）与筛选 chips', () => {
    renderTab();
    expect(screen.getByText('aiJudge.logsTitle')).toBeInTheDocument();
    // choice 答案徽注：枚举原文 + 置信 90%
    expect(screen.getByText('risk_level: write')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    // noul 0.44 → 44%（低置信态黄色由 AiVerdictPill 承担）
    expect(screen.getByText('safe: 44%')).toBeInTheDocument();
    expect(screen.getByText('aiJudge.logsFilterAll')).toBeInTheDocument();
  });
});
