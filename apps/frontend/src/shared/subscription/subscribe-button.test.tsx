import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SubscribeButton } from './subscribe-button';
import type { SubscriberItem } from './use-subscription';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/app/issues/t1' }),
}));

const mutate = vi.fn();
let subscribers: SubscriberItem[] = [];

vi.mock('./use-subscription', () => ({
  useRouteSubscriptionScope: () => ({ entityType: 'task', entityId: 't1' }),
  useSubscribers: () => ({ data: { items: subscribers } }),
  useMySubscriptions: () => ({
    data: { memberId: 'm-me', items: [{ entityType: 'task', entityId: 't1' }] },
  }),
  useSetSubscribers: () => ({ mutate, isPending: false }),
}));

vi.mock('@/modules/team-member/api/team-member-api', () => ({
  listMembers: vi.fn().mockResolvedValue({
    items: [
      { id: 'm-me', displayName: '我', type: 'human', handle: 'me' },
      { id: 'm-ai', displayName: 'Mika', type: 'ai_agent', handle: 'mika' },
    ],
  }),
}));

function renderButton() {
  const qc = new QueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <SubscribeButton />
    </QueryClientProvider>,
  );
}

describe('SubscribeButton', () => {
  beforeEach(() => {
    mutate.mockClear();
    subscribers = [
      {
        memberId: 'm-me',
        displayName: '我',
        avatarUrl: null,
        type: 'human',
        userId: 'u1',
        status: 'active',
      },
    ];
  });

  it('已订阅态渲染头像栈（data-subscribed）', () => {
    renderButton();
    const btn = document.querySelector('[data-ai-component="ui.subscribe-button"]');
    expect(btn).toBeTruthy();
    expect(btn!.getAttribute('data-subscribed')).toBe('true');
  });

  it('弹层分成员/智能体两组，勾选即替换订阅者集合', async () => {
    renderButton();
    fireEvent.click(document.querySelector('[data-ai-component="ui.subscribe-button"]')!);

    const agentRow = await waitFor(() =>
      screen.getByText('Mika').closest('button') as HTMLButtonElement,
    );
    fireEvent.click(agentRow);

    await waitFor(() => expect(mutate).toHaveBeenCalledTimes(1));
    expect(mutate).toHaveBeenCalledWith(['m-me', 'm-ai']);

    // 取消自己（取消订阅）：「我」同时命中头像 fallback 与行文本，取行按钮
    const myRow = screen
      .getAllByText('我')
      .map((el) => el.closest('button'))
      .find((b) => b?.getAttribute('data-ai-component') === 'ui.subscribe-row') as HTMLButtonElement;
    fireEvent.click(myRow);
    await waitFor(() => expect(mutate).toHaveBeenLastCalledWith([]));
  });
});
