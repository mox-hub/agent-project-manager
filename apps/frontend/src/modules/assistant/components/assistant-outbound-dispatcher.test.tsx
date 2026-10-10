/**
 * AssistantOutboundDispatcher —— 跨组件草稿出站的可靠性回归：
 * - Dock/办公室卡唤起请求携带草稿 → ensureConversation（真实 HTTP 往返，await 期间
 *   父组件会因 useMutation 结果对象引用变化等反复重渲染）→ sendMessage 恰好一次；
 * - 曾经的缺陷：effect 依赖含 ensureConversation（每渲染新引用），await 期间的任意
 *   重渲染触发 cleanup 把在途发送 cancelled 掉——会话已建、POST 未发，消息无声蒸发；
 * - 修复：发送上下文走 latest-ref，effect 只认 outbound/consumedNonce 变化。
 */
import { describe, expect, it, vi } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AssistantOutboundDispatcher } from './assistant-panel';

const sendMessage = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
  // @/i18n 初始化链（经 ui 组件导入）需要该导出
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: () => null,
}));

// toast 链带 i18n 初始化（jsdom 下 init 报错），且本组用例不触及错误分支
vi.mock('@/components/ui/toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('../hooks/use-assistant-chat', async (importOriginal) => ({
  // buildAssistantSendBody 是纯函数，保留真实实现供断言复用
  ...(await importOriginal<object>()),
  useAssistantChatHelpers: () => ({ sendMessage }),
}));

import { buildAssistantSendBody } from '../hooks/use-assistant-chat';

/** 手动控制 resolve 时机：模拟创建会话的真实网络延迟 */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('AssistantOutboundDispatcher —— 在途发送不被重渲染取消', () => {
  it('ensureConversation await 期间多次重渲染（引用型 props 变化），sendMessage 仍恰好调用一次', async () => {
    const gate = deferred<string>();
    let calls = 0;
    const ensureConversation = vi.fn(async () => {
      calls += 1;
      return gate.promise;
    });

    const outbound = { text: 'dock 草稿', nonce: 7 };
    const { rerender } = render(
      <AssistantOutboundDispatcher
        outbound={outbound}
        consumedNonce={0}
        onConsumed={() => {}}
        projectId={undefined}
        activeConversationId={undefined}
        ensureConversation={ensureConversation}
      />,
    );

    // outbound 就位，effect 已启动发送（await 中）
    expect(calls).toBe(1);

    // 模拟 await 期间父组件反复重渲染（真实场景：useMutation 结果对象每渲染新引用、
    // invalidate 触发查询状态变化等），并同步更新 latest-ref 的赋值 effect
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        rerender(
          <AssistantOutboundDispatcher
            outbound={outbound}
            consumedNonce={0}
            onConsumed={() => {}}
            projectId={undefined}
            activeConversationId={undefined}
            ensureConversation={ensureConversation}
          />,
        );
      });
    }

    // 真实面板时序：onConsumed 回写 consumedNonce → effect 依赖变化触发 cleanup，
    // 在途发送不得被这次依赖变化取消
    await act(async () => {
      rerender(
        <AssistantOutboundDispatcher
          outbound={outbound}
          consumedNonce={7}
          onConsumed={() => {}}
          projectId={undefined}
          activeConversationId={undefined}
          ensureConversation={ensureConversation}
        />,
      );
    });

    // 会话创建返回（此刻真实缺陷里 cleanup 已把发送 cancelled 掉）
    await act(async () => {
      gate.resolve('conv-1');
    });

    await waitFor(() => expect(sendMessage).toHaveBeenCalledTimes(1));
    expect(sendMessage).toHaveBeenCalledWith(
      { text: 'dock 草稿', metadata: {} },
      { body: buildAssistantSendBody({ projectId: undefined, conversationId: 'conv-1', viewing: null }) },
    );
    // await 前后 ensureConversation 只跑一次（重渲染不重触发 effect）
    expect(calls).toBe(1);
  });

  it('真卸载（面板关闭/会话切换）仍取消在途发送——不向已销毁的 Chat 实例发送', async () => {
    const gate = deferred<string>();
    const ensureConversation = vi.fn(async () => gate.promise);

    const { unmount } = render(
      <AssistantOutboundDispatcher
        outbound={{ text: '将被打断的草稿', nonce: 1 }}
        consumedNonce={0}
        onConsumed={() => {}}
        ensureConversation={ensureConversation}
      />,
    );

    unmount();
    await act(async () => {
      gate.resolve('conv-x');
    });

    // 微任务冲刷后仍不得发送
    await act(async () => {});
    expect(sendMessage).not.toHaveBeenCalled();
  });

  it('consumedNonce 已标记的草稿不重发（面板级去重，防切换会话后同问重发）', async () => {
    const ensureConversation = vi.fn(async () => undefined);
    render(
      <AssistantOutboundDispatcher
        outbound={{ text: '重复草稿', nonce: 3 }}
        consumedNonce={3}
        onConsumed={() => {}}
        ensureConversation={ensureConversation}
      />,
    );
    expect(ensureConversation).not.toHaveBeenCalled();
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
