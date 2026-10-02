import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { StatusDefinitionDialog } from './status-definition-dialog';
import type { StatusDefinitionLike } from './status-definition-list';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: unknown, opts?: Record<string, unknown>) => {
      const TEMPLATES: Record<string, string> = {
        'settings.statusKeyDisplay': '内部标识：{{key}}',
      };
      const fallback =
        TEMPLATES[key]
        ?? (typeof fallbackOrOpts === 'string'
          ? fallbackOrOpts
          : typeof fallbackOrOpts === 'object' && fallbackOrOpts !== null
            ? key
            : (opts as unknown as string | undefined) ?? key);
      const interp =
        typeof fallbackOrOpts === 'object' && fallbackOrOpts !== null
          ? fallbackOrOpts
          : typeof opts === 'object' && opts !== null
            ? opts
            : undefined;
      if (interp) {
        return (fallback as string).replace(/{{(\w+)}}/g, (_, name: string) =>
          String((interp as Record<string, unknown>)[name] ?? ''),
        );
      }
      return fallback as string;
    },
  }),
}));

const defs: StatusDefinitionLike[] = [
  { id: 's1', key: 'todo', name: '待办', group: 'unstarted', order: 10 },
  { id: 's2', key: 'in_progress', name: '进行中', group: 'started', order: 20 },
];

describe('StatusDefinitionDialog（新建/编辑弹窗语义组件）', () => {
  beforeEach(() => {
    // base-ui Dialog/Checkbox 点击路径依赖 window.PointerEvent（jsdom 缺失，同 dock-section.test）
    if (typeof (window as { PointerEvent?: unknown }).PointerEvent === 'undefined') {
      (window as unknown as { PointerEvent: unknown }).PointerEvent = class PointerEvent extends MouseEvent {
        pointerId: number;
        constructor(type: string, params: PointerEventInit = {}) {
          super(type, params);
          this.pointerId = params.pointerId ?? 0;
        }
      };
    }
  });

  it('新建：名称派生内部 key（snake），提交携带 defaultGroup 与同组步进 order', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <StatusDefinitionDialog
        open
        onOpenChange={() => {}}
        type="task"
        editing={null}
        defaultGroup="started"
        definitions={defs}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByPlaceholderText('例如：Code Review'), {
      target: { value: 'Code Review' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'task',
          name: 'Code Review',
          key: 'code_review',
          group: 'started',
          order: 30,
        }),
      ),
    );
  });

  it('编辑：回填字段且 key 冻结为存量值', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <StatusDefinitionDialog
        open
        onOpenChange={() => {}}
        type="task"
        editing={{ id: 's1', key: 'todo', name: '待办', group: 'unstarted', order: 10, color: '#6b7280' }}
        definitions={defs}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByText('内部标识：todo')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ key: 'todo', name: '待办' })),
    );
  });

  it('流转候选排除自身，勾选写入 allowedNextStatusKeys', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <StatusDefinitionDialog
        open
        onOpenChange={() => {}}
        type="task"
        editing={{ id: 's1', key: 'todo', name: '待办', group: 'unstarted', order: 10 }}
        definitions={defs}
        onSubmit={onSubmit}
      />,
    );
    // 候选只有「进行中」（自身 todo 已排除）
    const checkbox = screen.getByRole('checkbox', { name: '进行中' });
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ allowedNextStatusKeys: ['in_progress'] }),
      ),
    );
  });

  it('编辑态删除按钮走 onDelete 确认', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <StatusDefinitionDialog
        open
        onOpenChange={() => {}}
        type="task"
        editing={{ id: 's1', key: 'todo', name: '待办', group: 'unstarted', order: 10 }}
        definitions={defs}
        onSubmit={vi.fn()}
        onDelete={onDelete}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /common.delete/ }));
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });
});
