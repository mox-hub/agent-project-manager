import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SettingsFieldRow } from './settings-field-row';

describe('SettingsFieldRow（设置字段行）', () => {
  it('渲染字段名 / 说明 / 右侧控件', () => {
    render(
      <SettingsFieldRow
        title="常驻显示"
        description="Dock 栏在应用内常驻"
        control={<button type="button">开关</button>}
      />,
    );
    expect(screen.getByText('常驻显示')).toBeTruthy();
    expect(screen.getByText('Dock 栏在应用内常驻')).toBeTruthy();
    expect(screen.getByText('开关')).toBeTruthy();
  });

  it('description / control 不传时对应槽不渲染', () => {
    const { container } = render(<SettingsFieldRow title="仅说明行" />);
    expect(screen.getByText('仅说明行')).toBeTruthy();
    expect(container.querySelectorAll('p').length).toBe(1);
    // 仅左列一个子节点（控件槽不渲染）
    const row = container.querySelector('[data-slot="settings-field-row"]');
    expect(row?.children.length).toBe(1);
  });

  it('行骨架带边框圆角基准（rounded-lg border p-3）', () => {
    const { container } = render(<SettingsFieldRow title="x" control={<span>y</span>} />);
    const row = container.querySelector('[data-slot="settings-field-row"]');
    expect(row?.className).toContain('rounded-lg');
    expect(row?.className).toContain('border');
    expect(row?.className).toContain('p-3');
  });
});
