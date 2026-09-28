import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RefreshCw } from 'lucide-react';
import { HeaderActionButton } from './header-action-button';

/**
 * 本用例守护 2026-09-28 裁决：`HeaderActionButton` 的加载态**不再转动调用方传入的
 * 图标**，而是由组件内部渲染 `ui/spinner`（§10.6 加载指示唯一实现）。
 *
 * 按 §18.2 不断言 className——`role="status"` 是 Spinner 的**可访问性锚点**
 * （非样式开关），故用它作为「加载指示是否由唯一实现提供」的判据。
 */
describe('HeaderActionButton 加载态', () => {
  it('常态不出现加载指示', () => {
    render(<HeaderActionButton icon={RefreshCw} label="同步" />);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('loading 档由组件内部提供加载指示（role=status）', () => {
    render(<HeaderActionButton icon={RefreshCw} label="同步" loading />);
    expect(screen.getByRole('status')).toBeTruthy();
  });

  it('loading 档不吞掉可访问名', () => {
    render(<HeaderActionButton icon={RefreshCw} label="同步" loading />);
    expect(screen.getByRole('button', { name: '同步' })).toBeTruthy();
  });

  it('loading 是组件私有档，不落到 DOM 属性上', () => {
    render(<HeaderActionButton icon={RefreshCw} label="同步" loading />);
    const btn = screen.getByRole('button', { name: '同步' });
    expect(btn.hasAttribute('loading')).toBe(false);
  });

  it('与调用方自己的 disabled 组合时不互吞（§10.6 成对约定）', () => {
    render(<HeaderActionButton icon={RefreshCw} label="同步" loading disabled />);
    const btn = screen.getByRole('button', { name: '同步' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByRole('status')).toBeTruthy();
  });
});
