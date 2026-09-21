import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DesignSystemPage } from './design-system-page';

// Mock ResizeObserver for Recharts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom 未实现 scrollIntoView，cmdk 渲染选中项时会调用（Command Palette 演示段为真实原语）
Element.prototype.scrollIntoView = vi.fn();

// jsdom 未实现 matchMedia，Logo（auth-surface 演示段的 MemberCard 内）按主题取色时会调用
window.matchMedia = vi.fn().mockReturnValue({ matches: false });

describe('DesignSystemPage', () => {
  // 整页渲染全部设计系统组件（含 Command Palette 真实原语与高密度卡片演示段），
  // 本地实测 ~27s，CI runner 更慢会越过 30s 阈值——显式放宽到 180s
  it('renders all sections including AI High-Density Cards without errors', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const consoleError = vi.spyOn(console, 'error');

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <DesignSystemPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // 验证无任何嵌套 button 等 DOM 错误
    const nestedButtonErrors = consoleError.mock.calls.filter((args) =>
      String(args[0]).includes('cannot contain a nested <button>'),
    );
    expect(nestedButtonErrors).toHaveLength(0);

    // 验证侧栏存在 AI Execution 分组与对应页面标题
    expect(screen.getByText('AI Execution')).toBeInTheDocument();
    expect(screen.getAllByText('AI High-Density Cards [AI]')).toHaveLength(2);

    // 验证 5 类 AI 专属卡片渲染挂载
    expect(screen.getByText(/思考折叠核 \(ThinkingStream\)/)).toBeInTheDocument();
    expect(screen.getByText(/工具与命令执行胶囊 \(AssistantToolCard\)/)).toBeInTheDocument();
    expect(screen.getByText(/多 Agent 协作交接卡 \(AgentHandoffCard\)/)).toBeInTheDocument();
    expect(screen.getByText(/决策证据抽屉卡 \(DecisionCardShell\)/)).toBeInTheDocument();
    expect(screen.getByText(/双轨成本与执行微徽章 \(DualTrackMetricPill\)/)).toBeInTheDocument();

    consoleError.mockRestore();
    // 全量并行时机器慢，设计系统页渲染整套组件库，5s 默认超时不够
  }, 180_000);
});
