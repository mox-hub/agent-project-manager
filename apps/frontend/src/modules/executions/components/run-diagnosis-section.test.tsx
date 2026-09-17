import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RunDiagnosisSection } from './run-diagnosis-section';

/**
 * 失败诊断区单测（批一 P0 切片 3，裁决 D）：
 * 非失败态不渲染 / 机械归类 hint 直达 / AI 诊断触发 failure-diagnosis 场景 /
 * 按诊断重试携带 diagnosis 结论；escalate 不给自助重试。
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mocks = vi.hoisted(() => ({
  silent: vi.fn(),
  retryExecution: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: mocks.toastSuccess, error: vi.fn() },
}));

vi.mock('@/modules/assistant/api/assistant-api', () => ({
  assistantApi: {
    silent: (...args: unknown[]) => mocks.silent(...args),
  },
}));

vi.mock('@/modules/ai-hub/api/ai-hub-api', () => ({
  aiHubApi: {
    retryExecution: (...args: unknown[]) => mocks.retryExecution(...args),
  },
}));

function renderSection(props: {
  status?: string;
  classification?: {
    category: 'environment' | 'input' | 'dependency' | 'unknown';
    hint: string;
  } | null;
} = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RunDiagnosisSection
        runId="run-1"
        status={props.status ?? 'failed'}
        classification={
          props.classification === undefined
            ? { category: 'environment', hint: '运行环境出了问题' }
            : props.classification
        }
        projectId="p1"
      />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mocks.silent.mockReset();
  mocks.retryExecution.mockReset();
  mocks.toastSuccess.mockReset();
});

describe('RunDiagnosisSection', () => {
  it('非失败态不渲染', () => {
    const { container } = renderSection({ status: 'completed' });
    expect(container.querySelector('[data-testid="run-diagnosis-section"]')).toBeNull();
  });

  it('失败态渲染机械归类 hint（零 token 半）', () => {
    renderSection();
    expect(screen.getByTestId('run-diagnosis-hint').textContent).toContain(
      '运行环境出了问题',
    );
    expect(screen.getByTestId('run-diagnosis-trigger').textContent).toContain(
      'runDetails.diagnosis.aiButton',
    );
  });

  it('无机械归类信号时仍可触发 AI 诊断', () => {
    renderSection({ classification: null });
    expect(screen.queryByTestId('run-diagnosis-hint')).toBeNull();
    expect(screen.getByTestId('run-diagnosis-trigger')).toBeTruthy();
  });

  it('AI 诊断结论透传；按诊断重试携带 diagnosis 调 retry', async () => {
    mocks.silent.mockResolvedValue({
      data: {
        category: 'environment',
        reason: 'claude-code 命令不存在',
        recommendation: '先安装 claude-code 再重试',
        action: 'retry_adjusted',
        missingInfo: ['本机是否已安装 claude-code'],
      },
    });
    mocks.retryExecution.mockResolvedValue({ id: 'run-2' });
    renderSection();
    fireEvent.click(screen.getByTestId('run-diagnosis-trigger'));

    // 触发 failure-diagnosis 场景，上下文只带指针（executionRunId）
    await waitFor(() => expect(mocks.silent).toHaveBeenCalledTimes(1));
    expect(mocks.silent).toHaveBeenCalledWith('failure-diagnosis', {
      projectId: 'p1',
      context: { executionRunId: 'run-1' },
    });

    await waitFor(() =>
      expect(screen.getByTestId('run-diagnosis-result').textContent).toContain(
        '先安装 claude-code 再重试',
      ),
    );
    expect(screen.getByTestId('run-diagnosis-result').textContent).toContain(
      'runDetails.diagnosis.category.environment',
    );
    expect(screen.getByTestId('run-diagnosis-result').textContent).toContain(
      '本机是否已安装 claude-code',
    );

    fireEvent.click(screen.getByTestId('run-diagnosis-retry'));
    await waitFor(() => expect(mocks.retryExecution).toHaveBeenCalledTimes(1));
    expect(mocks.retryExecution).toHaveBeenCalledWith('run-1', {
      diagnosis: '先安装 claude-code 再重试',
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      'runDetails.diagnosis.retrySuccess',
    );
  });

  it('escalate（需人处理）不提供自助重试按钮', async () => {
    mocks.silent.mockResolvedValue({
      data: {
        category: 'unknown',
        reason: '现场不足',
        recommendation: '请联系有工程经验的同事',
        action: 'escalate',
        missingInfo: [],
      },
    });
    renderSection({ classification: null });
    fireEvent.click(screen.getByTestId('run-diagnosis-trigger'));
    await waitFor(() =>
      expect(screen.getByTestId('run-diagnosis-result').textContent).toContain(
        'runDetails.diagnosis.actionEscalate',
      ),
    );
    expect(screen.queryByTestId('run-diagnosis-retry')).toBeNull();
  });
});
