import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SubtaskBadge } from './subtask-badge';

describe('SubtaskBadge', () => {
  it('renders ring + count with 22px frame baseline', () => {
    const { container } = render(<SubtaskBadge done={2} total={3} />);
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
    // 22px 外框标准 + 等距贴合内边距（环 18px：左/上/下间隙统一 2px）
    expect(container.firstElementChild).toHaveClass('h-5.5', 'pl-0.5');
  });

  it('shows completed state at full ratio', () => {
    render(<SubtaskBadge done={3} total={3} />);
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });
});
