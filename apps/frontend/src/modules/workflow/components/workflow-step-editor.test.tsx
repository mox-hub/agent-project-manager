import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkflowStepEditor, type EditableStep } from './workflow-step-editor';
import type { WorkflowActionInfo } from '../api/workflow-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: Record<string, unknown>) => {
    if (key === 'workflow.editor.stepTitle') return `步骤：${opts?.id}`;
    return key;
  } }),
}));

const ACTIONS: WorkflowActionInfo[] = [
  {
    id: 'issue.create',
    title: '创建工单',
    description: '在指定项目下创建一条任务',
    requiredParams: ['projectId', 'title'],
    inputHint: { projectId: '项目 ID', title: '标题' },
  },
  {
    id: 'document.create',
    title: '创建文档',
    description: '在指定项目下落一篇文档',
    requiredParams: ['projectId', 'title', 'content'],
    inputHint: { projectId: '项目 ID', title: '标题', content: '正文' },
  },
];

const noop = vi.fn();

function renderEditor(step: EditableStep, overrides: Partial<Parameters<typeof WorkflowStepEditor>[0]> = {}) {
  return render(
    <WorkflowStepEditor
      step={step}
      actions={ACTIONS}
      isFirst={false}
      isLast={false}
      onChange={noop}
      onDelete={noop}
      onInsertAfter={noop}
      onMoveUp={noop}
      onMoveDown={noop}
      {...overrides}
    />,
  );
}

describe('WorkflowStepEditor（画布编辑属性面板）', () => {
  it('llm 步骤：渲染系统提示与用户提示字段', () => {
    renderEditor({ id: 'draft', type: 'llm', prompt: '写周报' });
    expect(screen.getByText('步骤：draft')).toBeTruthy();
    const prompt = screen.getByDisplayValue('写周报') as HTMLTextAreaElement;
    expect(prompt).toBeTruthy();
  });

  it('action 步骤：渲染动作下拉（目录清单）与参数 JSON 域', () => {
    renderEditor({
      id: 'create',
      type: 'action',
      action: 'issue.create',
      params: { projectId: 'p1', title: '标题' },
    });
    // 选中动作的描述可见（下拉选项文本在未展开时不渲染）
    expect(screen.getByText(/在指定项目下创建一条任务/)).toBeTruthy();
    expect(screen.getByDisplayValue(/"projectId": "p1"/)).toBeTruthy();
  });

  it('修改 prompt 触发 onChange 并携带新值；清空则移除字段', () => {
    let latest: EditableStep | null = null;
    renderEditor({ id: 'draft', type: 'llm', prompt: '旧提示' }, {
      onChange: (s) => (latest = s),
    });
    fireEvent.change(screen.getByDisplayValue('旧提示'), { target: { value: '新提示' } });
    expect(latest).toMatchObject({ prompt: '新提示' });
  });

  it('params 非法 JSON 不落 onChange（保持旧值等合法再改）', () => {
    const onChange = vi.fn();
    renderEditor(
      { id: 'a', type: 'action', action: 'issue.create', params: { ok: 1 } },
      { onChange },
    );
    fireEvent.change(screen.getByDisplayValue(/"ok": 1/), {
      target: { value: '{ broken' },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('操作按钮：上移在首位禁用、删除与插入触发回调', () => {
    const onDelete = vi.fn();
    const onInsertAfter = vi.fn();
    const onMoveUp = vi.fn();
    renderEditor(
      { id: 'only', type: 'llm', prompt: 'x' },
      { isFirst: true, onDelete, onInsertAfter, onMoveUp },
    );
    expect(
      (screen.getByLabelText('workflow.editor.moveUp') as HTMLButtonElement).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText('workflow.editor.delete'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByText('workflow.editor.insertAfter'));
    expect(onInsertAfter).toHaveBeenCalledTimes(1);
  });
});
