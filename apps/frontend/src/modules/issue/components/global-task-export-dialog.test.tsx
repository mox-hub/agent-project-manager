import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalTaskExportDialog } from './global-task-export-dialog';
import type { Task } from '../api/issue-api';

const translate = (
  key: string,
  defaultValue?: string | Record<string, unknown>,
  options?: Record<string, unknown>,
) => {
  let template =
    typeof defaultValue === 'string'
      ? defaultValue
      : ((defaultValue as { defaultValue?: string } | null)?.defaultValue ?? key);
  const opts = defaultValue !== null && typeof defaultValue === 'object' ? defaultValue : options;
  if (opts && typeof opts === 'object') {
    for (const [k, v] of Object.entries(opts)) {
      template = template.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
  }
  return template;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const tasks = [
  { id: 't1', title: 'Alpha', status: 'todo', priority: 'high', projectId: 'p1' },
  { id: 't2', title: 'Beta', status: 'done', priority: 'low', projectId: null },
] as unknown as Task[];

const createObjectURL = vi.fn(() => 'blob:mock');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

describe('GlobalTaskExportDialog（P1-15 全局导出）', () => {
  it('states the export scope as the current filtered result count', () => {
    render(<GlobalTaskExportDialog open onOpenChange={vi.fn()} tasks={tasks} getProjectName={() => 'P1'} />);

    // 导出范围明示：当前筛选结果（2 条），避免「导出的和我看到的不一样」
    expect(screen.getByText('导出范围：当前筛选结果（2 条）——与列表当前的搜索、筛选和排序一致，而非全部工单。')).toBeTruthy();
  });

  it('downloads a file from the current filtered tasks and closes', () => {
    const onOpenChange = vi.fn();
    render(
      <GlobalTaskExportDialog open onOpenChange={onOpenChange} tasks={tasks} getProjectName={() => 'P1'} />,
    );

    fireEvent.click(screen.getByRole('button', { name: '导出 2 条' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('disables the confirm button when the filtered result is empty', () => {
    render(<GlobalTaskExportDialog open onOpenChange={vi.fn()} tasks={[]} />);

    expect(screen.getByRole('button', { name: '导出 0 条' })).toHaveProperty('disabled', true);
  });
});
