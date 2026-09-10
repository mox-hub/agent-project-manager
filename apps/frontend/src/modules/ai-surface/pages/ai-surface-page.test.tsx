import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AiSurfacePage } from './ai-surface-page';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AiSurfacePage', () => {
  it('renders synthetic cognitive surface with agents and omni dock', () => {
    render(
      <MemoryRouter>
        <AiSurfacePage />
      </MemoryRouter>,
    );

    // 验证空间标头
    expect(screen.getByText('APM SYNTHETIC COGNITIVE SURFACE')).toBeInTheDocument();
    expect(screen.getByText('DUAL-SURFACE V4')).toBeInTheDocument();

    // 验证左翼 Agent 编队
    expect(screen.getByText('Aria')).toBeInTheDocument();
    expect(screen.getByText('DaVinci')).toBeInTheDocument();
    expect(screen.getByText('Nexus')).toBeInTheDocument();
    expect(screen.getByText('Sentinel')).toBeInTheDocument();

    // 验证右翼信度评分
    expect(screen.getByText('信度总分')).toBeInTheDocument();
    expect(screen.getByText('契约合规率')).toBeInTheDocument();

    // 验证底部 Omni-Dock
    expect(screen.getByPlaceholderText(/输入协同指令/)).toBeInTheDocument();
  });

  it('allows typing and sending message through omni dock', () => {
    render(
      <MemoryRouter>
        <AiSurfacePage />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText(/输入协同指令/);
    fireEvent.change(input, { target: { value: '请对齐 CAP-P-01 契约' } });
    expect(input).toHaveValue('请对齐 CAP-P-01 契约');

    const form = input.closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    // 验证人类发送的消息出现在认知流中
    expect(screen.getByText('请对齐 CAP-P-01 契约')).toBeInTheDocument();
    expect(screen.getByText('人类指挥官 (You)')).toBeInTheDocument();
  });
});
