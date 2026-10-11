/**
 * ConfigureAiStep 建员工链测试（CAP-A-18 AI 员工引导闭环切片，GAP-T-68）。
 *
 * 覆盖：测试通过成功链自动创建默认 AI 员工（type=ai_agent + 固定 handle +
 * aiModelConfigId 优先真实库记录回落合成 id）；handle 冲突（409）视为已达成
 * 静默；其他失败 toast 提示但不阻塞主链成功反馈。
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { validateProviderMock, getModelsMock, createMemberMock, toastMocks } = vi.hoisted(() => ({
  validateProviderMock: vi.fn(),
  getModelsMock: vi.fn(),
  createMemberMock: vi.fn(),
  toastMocks: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@/modules/ai-hub/api/ai-hub-api', () => ({
  aiHubApi: {
    validateProvider: validateProviderMock,
    getModels: getModelsMock,
  },
}));

vi.mock('@/modules/ai-hub/hooks/use-ai-providers', () => ({
  useAiProviders: () => ({
    data: [
      {
        id: 'cfg-1',
        provider: 'openai',
        providerId: 'openai',
        displayName: 'OpenAI',
        baseUrl: '',
        hasApiKey: false,
        enabled: true,
      },
    ],
    isLoading: false,
  }),
  useUpdateProvider: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
  useSetDefaultModel: () => ({ mutateAsync: vi.fn().mockResolvedValue({}) }),
}));

vi.mock('@/modules/team-member/api/team-member-api', () => ({
  createMember: createMemberMock,
}));

vi.mock('@/components/ui/toast', () => ({
  toast: toastMocks,
}));

import { Dialog } from '@/components/ui/dialog';
import { ConfigureAiStep } from './configure-ai-step';

function pickProviderAndFillKey() {
  fireEvent.click(screen.getByText('OpenAI'));
  fireEvent.change(screen.getByLabelText('onboarding.configureAi.quick.apiKeyLabel'), {
    target: { value: 'sk-test' },
  });
}

describe('ConfigureAiStep 建员工链（CAP-A-18 AI 员工引导闭环）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validateProviderMock.mockResolvedValue({ valid: true, models: ['gpt-4o'] });
    getModelsMock.mockResolvedValue([
      { id: 'openai_gpt-4o', name: 'gpt-4o', provider: 'openai', enabled: true },
    ]);
    createMemberMock.mockResolvedValue({ id: 'm-1' });
  });

  it('★ 测试通过成功链自动创建默认 AI 员工：type=ai_agent、固定 handle、aiModelConfigId 无库记录时回落合成 id', async () => {
    render(
      <Dialog open>
        <ConfigureAiStep />
      </Dialog>
    );
    pickProviderAndFillKey();
    fireEvent.click(screen.getByText('onboarding.configureAi.quick.testAndSave'));

    await waitFor(() => {
      expect(createMemberMock).toHaveBeenCalledTimes(1);
    });
    expect(createMemberMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'ai_agent',
        handle: 'ai-assistant',
        displayName: 'onboarding.configureAi.agentDefaults.displayName',
        aiModelConfigId: 'openai_gpt-4o',
        metadata: { model: 'gpt-4o', provider: 'openai' },
      }),
    );
    expect(toastMocks.success).toHaveBeenCalledWith('onboarding.configureAi.quick.savedToast');
  });

  it('有真实库记录（非 provider_ 前缀合成 id）时优先绑库记录', async () => {
    getModelsMock.mockResolvedValue([
      { id: 'cuid001_real_model_config', name: 'gpt-4o', provider: 'openai', enabled: true },
      { id: 'openai_gpt-4o', name: 'gpt-4o', provider: 'openai', enabled: true },
    ]);
    render(
      <Dialog open>
        <ConfigureAiStep />
      </Dialog>
    );
    pickProviderAndFillKey();
    fireEvent.click(screen.getByText('onboarding.configureAi.quick.testAndSave'));

    await waitFor(() => {
      expect(createMemberMock).toHaveBeenCalledTimes(1);
    });
    expect(createMemberMock).toHaveBeenCalledWith(
      expect.objectContaining({ aiModelConfigId: 'cuid001_real_model_config' }),
    );
  });

  it('handle 已存在（409）视为目标已达成：不报错，主链成功反馈照常', async () => {
    createMemberMock.mockRejectedValue(Object.assign(new Error('handle 已存在'), { status: 409 }));
    render(
      <Dialog open>
        <ConfigureAiStep />
      </Dialog>
    );
    pickProviderAndFillKey();
    fireEvent.click(screen.getByText('onboarding.configureAi.quick.testAndSave'));

    await waitFor(() => {
      expect(toastMocks.success).toHaveBeenCalled();
    });
    expect(toastMocks.warning).not.toHaveBeenCalledWith(
      'onboarding.configureAi.quick.agentCreateFailed',
    );
  });

  it('建员工其他失败：toast 提示去成员页手动建，但不阻塞 Key 保存的成功反馈', async () => {
    createMemberMock.mockRejectedValue(new Error('boom'));
    render(
      <Dialog open>
        <ConfigureAiStep />
      </Dialog>
    );
    pickProviderAndFillKey();
    fireEvent.click(screen.getByText('onboarding.configureAi.quick.testAndSave'));

    await waitFor(() => {
      expect(toastMocks.warning).toHaveBeenCalledWith(
        'onboarding.configureAi.quick.agentCreateFailed',
      );
    });
    expect(toastMocks.success).toHaveBeenCalledWith('onboarding.configureAi.quick.savedToast');
  });
});
