import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionScrubber, type ScrubberSection } from './section-scrubber';

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
  fire(entries: Array<{ target: Element; isIntersecting: boolean }>) {
    act(() => {
      this.callback(
        entries.map((e) => ({ target: e.target, isIntersecting: e.isIntersecting })) as unknown as IntersectionObserverEntry[],
        this as unknown as IntersectionObserver,
      );
    });
  }
}

const SECTIONS: ScrubberSection[] = [
  { id: 'sec-a', label: '主题' },
  { id: 'sec-b', label: '字体' },
  { id: 'sec-c', label: '语言' },
];

describe('SectionScrubber（设置页栏目跳转条）', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
    document.body.innerHTML = '';
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('按声明顺序渲染栏目 chips，首个默认激活（aria-current）', () => {
    render(<SectionScrubber sections={SECTIONS} />);
    expect(screen.getByText('主题')).toBeTruthy();
    expect(screen.getByText('字体')).toBeTruthy();
    expect(screen.getByText('语言')).toBeTruthy();
    expect(screen.getByText('主题').getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('字体').getAttribute('aria-current')).toBeNull();
  });

  it('点击 chip：scrollIntoView 平滑滚动到目标锚点并立即高亮', () => {
    const target = document.createElement('div');
    target.id = 'sec-b';
    document.body.appendChild(target);
    render(<SectionScrubber sections={SECTIONS} />);
    fireEvent.click(screen.getByText('字体'));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'start',
    });
    expect(screen.getByText('字体').getAttribute('aria-current')).toBe('true');
  });

  it('scrollspy：栏目 b 进入激活带 → 高亮迁移；全部离开 → 保持现值', () => {
    const a = document.createElement('div');
    a.id = 'sec-a';
    const b = document.createElement('div');
    b.id = 'sec-b';
    document.body.append(a, b);
    render(<SectionScrubber sections={SECTIONS} />);
    const io = FakeIntersectionObserver.instances[0];
    // a、b 均被观察
    expect(io.observed).toContain(a);
    expect(io.observed).toContain(b);
    io.fire([
      { target: a, isIntersecting: false },
      { target: b, isIntersecting: true },
    ]);
    expect(screen.getByText('字体').getAttribute('aria-current')).toBe('true');
    io.fire([{ target: b, isIntersecting: false }]);
    expect(screen.getByText('字体').getAttribute('aria-current')).toBe('true');
  });

  it('目标锚点缺失（画廊静态 demo）：不观察、点击仅本地高亮不炸', () => {
    render(<SectionScrubber sections={SECTIONS} />);
    const io = FakeIntersectionObserver.instances[0];
    expect(io.observed.length).toBe(0);
    expect(() => fireEvent.click(screen.getByText('语言'))).not.toThrow();
    expect(screen.getByText('语言').getAttribute('aria-current')).toBe('true');
  });

  it('空 sections 不渲染 chips 也不建 observer', () => {
    render(<SectionScrubber sections={[]} />);
    expect(FakeIntersectionObserver.instances.length).toBe(0);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
