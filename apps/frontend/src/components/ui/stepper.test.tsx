import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Check } from 'lucide-react';
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTitle,
  StepperTrigger,
} from './stepper';

function items() {
  return Array.from(document.querySelectorAll('[data-slot="stepper-item"]'));
}

describe('Stepper（reui base-nova 移植）', () => {
  it('非受控：点击 Trigger 切换活动步，前置步派生 completed', async () => {
    const user = userEvent.setup();
    render(
      <Stepper defaultValue={1}>
        <StepperNav>
          {[1, 2, 3].map((n) => (
            <StepperItem key={n} step={n}>
              <StepperTrigger>
                <StepperIndicator>{n}</StepperIndicator>
              </StepperTrigger>
              {n < 3 && <StepperSeparator />}
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');

    await user.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
    expect(items()[0]).toHaveAttribute('data-state', 'completed');
    expect(items()[2]).toHaveAttribute('data-state', 'active');
  });

  it('受控 + disabled：value 固定活动步，禁用步不可点击', async () => {
    const user = userEvent.setup();
    render(
      <Stepper value={2}>
        <StepperNav>
          {[1, 2, 3].map((n) => (
            <StepperItem key={n} step={n} disabled={n === 3}>
              <StepperTrigger>
                <StepperIndicator>{n}</StepperIndicator>
              </StepperTrigger>
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[2]).toBeDisabled();

    await user.click(tabs[2]);
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
  });

  it('indicators 覆写：completed/loading 态替换指示器内容', () => {
    render(
      <Stepper
        value={2}
        indicators={{
          completed: <Check data-testid="done-icon" />,
          loading: <span data-testid="loading-icon" />,
        }}
      >
        <StepperNav>
          {[1, 2, 3].map((n) => (
            <StepperItem key={n} step={n} loading={n === 2}>
              <StepperTrigger>
                <StepperIndicator>{n}</StepperIndicator>
              </StepperTrigger>
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>
    );

    expect(screen.getByTestId('done-icon')).toBeInTheDocument();
    expect(screen.getByTestId('loading-icon')).toBeInTheDocument();
    expect(screen.queryByText('1')).toBeNull();
  });

  it('纯展示形态（不放 Trigger）：无 tab 语义，状态仍由 value 派生', () => {
    render(
      <Stepper value={3}>
        <StepperNav>
          {[1, 2, 3].map((n) => (
            <StepperItem key={n} step={n}>
              <div>
                <StepperIndicator>{n}</StepperIndicator>
                <StepperTitle>步骤{n}</StepperTitle>
              </div>
              {n < 3 && <StepperSeparator />}
            </StepperItem>
          ))}
        </StepperNav>
      </Stepper>
    );

    expect(screen.queryAllByRole('tab')).toHaveLength(0);
    expect(items()[0]).toHaveAttribute('data-state', 'completed');
    expect(items()[2]).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('步骤3')).toBeInTheDocument();
  });
});
