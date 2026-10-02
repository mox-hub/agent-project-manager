import { act } from '@testing-library/react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Palette } from 'lucide-react';
import { SettingsHeader } from './settings-header';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

/** IntersectionObserver fake：手动驱动 entries（jsdom 无实现） */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    act(() => {
      this.callback(
        this.observed.map((target) => ({ target, isIntersecting })) as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver,
      );
    });
  }
}

function renderHeader(overrides?: Partial<Parameters<typeof SettingsHeader>[0]>) {
  return render(
    <SettingsHeader
      icon={Palette}
      tone="purple"
      title="外观"
      description="主题、字体与语言偏好。"
      metrics={<span data-testid="metrics">共 4 项</span>}
      actions={<button type="button">操作</button>}
      scrubber={<nav data-testid="scrubber" />}
      {...overrides}
    />,
  );
}

describe('SettingsHeader（设置页头，双态吸顶卡）', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  it('常态渲染：大标题 / 描述 / 计数 / 操作槽 / scrubber 槽，初始 data-stuck=false', () => {
    const { container } = renderHeader();
    expect(screen.getByText('外观')).toBeTruthy();
    expect(screen.getByText('主题、字体与语言偏好。')).toBeTruthy();
    expect(screen.getByTestId('metrics')).toBeTruthy();
    expect(screen.getByText('操作')).toBeTruthy();
    expect(screen.getByTestId('scrubber')).toBeTruthy();
    const header = container.querySelector('[data-slot="settings-header"]');
    expect(header?.getAttribute('data-stuck')).toBe('false');
    // sentinel 在 sticky 盒外（header 的前兄弟）
    expect(header?.previousElementSibling?.getAttribute('aria-hidden')).toBe('true');
  });

  it('sentinel 离开视口 → data-stuck=true（吸顶卡态）', () => {
    const { container } = renderHeader();
    const io = FakeIntersectionObserver.instances[0];
    io.fire(false);
    const header = container.querySelector('[data-slot="settings-header"]');
    expect(header?.getAttribute('data-stuck')).toBe('true');
    io.fire(true);
    expect(header?.getAttribute('data-stuck')).toBe('false');
  });

  it('不传 scrubber / description 时槽位不渲染', () => {
    renderHeader({ scrubber: undefined, description: undefined });
    expect(screen.queryByTestId('scrubber')).toBeNull();
    expect(screen.queryByText('主题、字体与语言偏好。')).toBeNull();
  });

  it('tone 上图标底框装饰色（purple → accent-purple-light）', () => {
    const { container } = renderHeader();
    const frame = container.querySelector('[data-slot="settings-header"] span');
    expect(frame?.className).toContain('bg-accent-purple-light');
    expect(frame?.querySelector('svg')).toBeTruthy();
  });

  it('sentinel 离开视口触发 observer 判定（observe 被调用）', () => {
    renderHeader();
    const io = FakeIntersectionObserver.instances[0];
    expect(io.observed.length).toBe(1);
    expect(() => io.fire(false)).not.toThrow();
    // fireEvent 冒烟：交互宿主环境无异常
    fireEvent.click(screen.getByText('操作'));
  });
});
