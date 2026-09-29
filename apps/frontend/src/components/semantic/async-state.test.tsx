import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText } from 'lucide-react';
import { AsyncState } from './async-state';

// vitest 环境无 i18next 实例，AsyncState 走 t() 回退文案（同仓内既有约定）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, fallback?: string) => fallback ?? key }),
}));

/**
 * D14 测试基线（宪法 §18）。async-state 引用数 22，P2「装配原语」。
 *
 * ⚠️ 分工说明：本仓已有 `empty-state.test.tsx` 覆盖了 AsyncState 的
 * **空态透传**与**错误态形态**两支（且是 className 断言）。本文件只补
 * §18.2 要求的另一半：**四态分支的判定优先级 + loading 兜底 + 重试回调**，
 * 并改用「可访问角色/文本 + 回调」断言，不再重复样式断言。
 */
describe('AsyncState 四态分支', () => {
  it('无状态时渲染 children（默认分支不吞内容）', () => {
    render(
      <AsyncState>
        <p>业务内容</p>
      </AsyncState>,
    );

    expect(screen.getByText('业务内容')).toBeInTheDocument();
  });

  it('loading 默认兜底渲染可读文案（不出现空白屏）', () => {
    render(
      <AsyncState isLoading>
        <p>业务内容</p>
      </AsyncState>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('业务内容')).toBeNull();
  });

  it('loading 传入 loadingFallback 时优先用调用方骨架', () => {
    render(
      <AsyncState isLoading loadingFallback={<span data-testid="skeleton">骨架</span>}>
        <p>业务内容</p>
      </AsyncState>,
    );

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Loading...')).toBeNull();
  });

  it('错误态优先于空态（error + isEmpty 同时成立时给出失败而非「暂无数据」）', () => {
    render(
      <AsyncState error="接口 500" isEmpty>
        <p>业务内容</p>
      </AsyncState>,
    );

    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByText('接口 500')).toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).toBeNull();
  });

  it('loading 优先于错误态（重试中的请求不再闪错误）', () => {
    render(
      <AsyncState isLoading error="接口 500">
        <p>业务内容</p>
      </AsyncState>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('加载失败')).toBeNull();
  });

  it('emptyTitle/emptyDescription 覆盖默认空态文案', () => {
    render(
      <AsyncState isEmpty emptyIcon={FileText} emptyTitle="还没有工单" emptyDescription="新建一个开始">
        <p>业务内容</p>
      </AsyncState>,
    );

    expect(screen.getByText('还没有工单')).toBeInTheDocument();
    expect(screen.getByText('新建一个开始')).toBeInTheDocument();
  });
});

describe('AsyncState 重试交互（§18.2 受控回调）', () => {
  it('错误态给出重试按钮，点击触发 onRetry 一次', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <AsyncState error="网络不可达" onRetry={onRetry}>
        <p>业务内容</p>
      </AsyncState>,
    );

    await user.click(screen.getByRole('button', { name: '重试' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('未传 onRetry 时不渲染重试按钮（不留假动作）', () => {
    render(
      <AsyncState error="网络不可达">
        <p>业务内容</p>
      </AsyncState>,
    );

    expect(screen.queryByRole('button', { name: '重试' })).toBeNull();
    expect(screen.getByText('网络不可达')).toBeInTheDocument();
  });

  it('空态与默认态都不出现重试按钮（重试只属错误态）', () => {
    const { unmount } = render(
      <AsyncState isEmpty>
        <p>业务内容</p>
      </AsyncState>,
    );
    expect(screen.queryByRole('button', { name: '重试' })).toBeNull();
    unmount();

    render(
      <AsyncState>
        <p>业务内容</p>
      </AsyncState>,
    );
    expect(screen.queryByRole('button', { name: '重试' })).toBeNull();
  });
});
