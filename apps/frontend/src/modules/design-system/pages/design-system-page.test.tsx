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

describe('DesignSystemPage', () => {
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
  });
});
