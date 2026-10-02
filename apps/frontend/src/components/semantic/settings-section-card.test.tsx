import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Bell, Palette } from 'lucide-react';
import { SettingsSectionCard } from './settings-section-card';

describe('SettingsSectionCard（设置栏目卡）', () => {
  it('渲染图标 / 标题 / 描述 / 操作槽 / 内容区', () => {
    const { container } = render(
      <SettingsSectionCard
        icon={Palette}
        tone="blue"
        title="主题模式"
        description="日间 / 夜间 / 跟随系统。"
        actions={<button type="button">重置</button>}
      >
        <p data-testid="content">内容区</p>
      </SettingsSectionCard>,
    );
    expect(screen.getByText('主题模式')).toBeTruthy();
    expect(screen.getByText('日间 / 夜间 / 跟随系统。')).toBeTruthy();
    // 图标框（首个 span）内渲染 Lucide svg
    expect(container.querySelector('span svg')).toBeTruthy();
    expect(screen.getByTestId('content')).toBeTruthy();
    fireEvent.click(screen.getByText('重置'));
  });

  it('id 即锚点：section 挂 id 且带 scroll-mt-24 避让吸顶卡', () => {
    const { container } = render(
      <SettingsSectionCard id="sec-theme" icon={Bell} title="主题">
        <p>x</p>
      </SettingsSectionCard>,
    );
    const section = container.querySelector('section');
    expect(section?.id).toBe('sec-theme');
    expect(section?.className).toContain('scroll-mt-24');
  });

  it("tone='danger' 危险区档：data-tone + 红框红标题红图标", () => {
    const { container } = render(
      <SettingsSectionCard icon={Bell} tone="danger" title="危险区">
        <p>x</p>
      </SettingsSectionCard>,
    );
    const section = container.querySelector('section');
    expect(section?.getAttribute('data-tone')).toBe('danger');
    expect(section?.className).toContain('border-accent-red/40');
    const heading = container.querySelector('h2');
    expect(heading?.className).toContain('text-accent-red');
  });

  it('默认 tone=blue：图标底框 accent-blue-light，data-tone=blue', () => {
    const { container } = render(
      <SettingsSectionCard icon={Bell} title="栏目">
        <p>x</p>
      </SettingsSectionCard>,
    );
    const section = container.querySelector('section');
    expect(section?.getAttribute('data-tone')).toBe('blue');
    const frame = section?.querySelector('span');
    expect(frame?.className).toContain('bg-accent-blue-light');
  });

  it('description / actions 不传时不渲染对应槽', () => {
    const { container } = render(
      <SettingsSectionCard icon={Bell} title="栏目">
        <p>x</p>
      </SettingsSectionCard>,
    );
    expect(container.querySelector('header p')).toBeNull();
    expect(container.querySelector('h2')?.textContent).toBe('栏目');
  });

  it('操作槽回调可达', () => {
    const onClick = vi.fn();
    render(
      <SettingsSectionCard
        icon={Bell}
        title="栏目"
        actions={<button type="button" onClick={onClick}>动作</button>}
      >
        <p>x</p>
      </SettingsSectionCard>,
    );
    fireEvent.click(screen.getByText('动作'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
