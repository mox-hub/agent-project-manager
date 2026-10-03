import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { AiVerdictPill } from './ai-verdict-pill';
import { ConfidenceBar } from './confidence-bar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('AiVerdictPill（JEV 判断徽注）', () => {
  it('渲染判定文案 + 置信度百分比（高置信紫系）', () => {
    const { container } = render(
      <AiVerdictPill label="建议批准" confidence={0.92} />,
    );
    expect(screen.getByText('建议批准')).toBeInTheDocument();
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute(
      'data-ai-component',
      'ai-verdict-pill',
    );
    expect(container.firstElementChild).toHaveAttribute(
      'data-confidence',
      '0.92',
    );
    expect(container.firstElementChild).not.toHaveTextContent('aiJudge.lowConfidence');
  });

  it('低置信（<0.7）转黄并标低置信', () => {
    const { container } = render(
      <AiVerdictPill label="benign" confidence={0.55} />,
    );
    expect(container.firstElementChild).toHaveClass('text-accent-yellow');
    expect(screen.getByText('aiJudge.lowConfidence')).toBeInTheDocument();
  });

  it('无置信度时不渲染百分比与低置信标注，仅判定文案', () => {
    render(<AiVerdictPill label="高风险" />);
    expect(screen.getByText('高风险')).toBeInTheDocument();
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
    expect(screen.queryByText('aiJudge.lowConfidence')).not.toBeInTheDocument();
  });

  it('size=xs 走 2xs 字阶（行内紧凑位）', () => {
    const { container } = render(
      <AiVerdictPill label="benign" confidence={0.9} size="xs" />,
    );
    expect(container.firstElementChild).toHaveClass('text-2xs');
  });
});

describe('ConfidenceBar（JEV 概率条）', () => {
  it('渲染标签 + 概率条 + 百分比（高置信紫系）', () => {
    const { container } = render(
      <ConfidenceBar value={0.87} label="AI 预估达成" />,
    );
    expect(screen.getByText('AI 预估达成')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute(
      'data-ai-component',
      'confidence-bar',
    );
    // 条内填充宽度 = 概率（手搓 div 几何自持）
    const fill = container.querySelector('[style*="width"]');
    expect(fill).toHaveStyle({ width: '87%' });
  });

  it('低置信整条转黄', () => {
    const { container } = render(<ConfidenceBar value={0.42} />);
    expect(container.firstElementChild).toHaveClass('select-none');
    expect(container.querySelector('[style*="width"]')).toHaveStyle({
      width: '42%',
    });
    expect(screen.getByText('42%')).toHaveClass('text-accent-yellow');
  });

  it('hidePercent 隐藏右侧数字（行内紧凑位）', () => {
    render(<ConfidenceBar value={0.96} hidePercent />);
    expect(screen.queryByText('96%')).not.toBeInTheDocument();
  });

  it('非法值（NaN / 越界）不渲染，越界值截断到 [0,1]', () => {
    const { container: nanBox } = render(<ConfidenceBar value={Number.NaN} />);
    expect(nanBox.firstElementChild).toBeNull();
    const { container: bigBox } = render(<ConfidenceBar value={1.5} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(bigBox.querySelector('[style*="width"]')).toHaveStyle({
      width: '100%',
    });
  });

  it('缺省标签走 i18n 键（调用方可覆写具体文案）', () => {
    render(<ConfidenceBar value={0.8} />);
    expect(screen.getByText('aiJudge.estimatedProbability')).toBeInTheDocument();
  });
});
