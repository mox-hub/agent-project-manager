import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoginWorkspacePicker } from './login-workspace-picker';

// i18n mock 仅透传键名，断言直接对着键写
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// SelectField 底为 base-ui，jsdom 交互不便；替成语义等价的受控原生 select
vi.mock('@/components/ui/select-field', () => ({
  SelectField: ({
    value,
    onChange,
    disabled,
    id,
    children,
  }: {
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    disabled?: boolean;
    id?: string;
    children?: React.ReactNode;
  }) => (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.({ target: { value: e.target.value } })}
    >
      {children}
    </select>
  ),
  SelectFieldOption: ({
    value,
    children,
  }: {
    value: string;
    children?: React.ReactNode;
  }) => <option value={value}>{children}</option>,
}));

const recentState: { data: { id: string; name: string }[] } = { data: [] };
vi.mock('@/modules/workspace/api/workspace-api', () => ({
  getRecentWorkspaces: () => recentState.data,
}));

const listState: { data?: { enabled: boolean; workspaces: unknown[] } } = {};
vi.mock('@/modules/workspace/hooks/use-public-workspace-list', () => ({
  usePublicWorkspaceList: () => ({ data: listState.data }),
}));

const optionValues = () =>
  screen.getAllByRole('option').map((o) => o.getAttribute('value'));

beforeEach(() => {
  recentState.data = [];
  listState.data = { enabled: false, workspaces: [] };
});

describe('LoginWorkspacePicker（登录卡片工作区选择，CAP-A-26）', () => {
  it('名单关闭：候选项 = 默认空间 + 本机最近工作区（去重）+ 手动态', () => {
    recentState.data = [
      { id: 'ws-a', name: 'A 空间' },
      { id: 'default', name: '重复默认（应被去重）' },
      { id: 'ws-b', name: 'B 空间' },
    ];
    render(<LoginWorkspacePicker value="default" onChange={vi.fn()} />);

    expect(optionValues()).toEqual([
      'default',
      'ws-a',
      'ws-b',
      '__manual__',
    ]);
  });

  it('名单开启：候选项来自公开名单（忽略本机最近列表）', () => {
    recentState.data = [{ id: 'ws-local', name: '本地残留' }];
    listState.data = {
      enabled: true,
      workspaces: [
        { id: 'default', name: '默认工作区', isDefault: true },
        { id: 'ws-public', name: '公开空间' },
      ],
    };
    render(<LoginWorkspacePicker value="default" onChange={vi.fn()} />);

    const values = optionValues();
    expect(values).toEqual(['default', 'ws-public', '__manual__']);
    expect(values).not.toContain('ws-local');
  });

  it('选择已有工作区：以 id + name 通知调用方（供记入最近列表）', () => {
    listState.data = {
      enabled: true,
      workspaces: [{ id: 'ws-public', name: '公开空间' }],
    };
    const onChange = vi.fn();
    render(<LoginWorkspacePicker value="default" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'ws-public' },
    });

    expect(onChange).toHaveBeenCalledWith('ws-public', '公开空间');
  });

  it('选择「手动输入」：切换为输入框，输入 id 触发 onChange', () => {
    const onChange = vi.fn();
    render(<LoginWorkspacePicker value="default" onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '__manual__' },
    });

    const input = screen.getByPlaceholderText('auth.workspace.manualPlaceholder');
    fireEvent.change(input, { target: { value: 'ws-typed' } });

    expect(onChange).toHaveBeenLastCalledWith('ws-typed');
  });

  it('手动输入清空：回落默认工作区 id', () => {
    const onChange = vi.fn();
    render(<LoginWorkspacePicker value="ws-typed" onChange={onChange} />);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: '__manual__' },
    });

    const input = screen.getByPlaceholderText('auth.workspace.manualPlaceholder');
    fireEvent.change(input, { target: { value: '   ' } });

    expect(onChange).toHaveBeenLastCalledWith('default');
  });
});
