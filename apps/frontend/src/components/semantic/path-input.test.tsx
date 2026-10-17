import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PathInput, type PathCheckResult } from './path-input';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${Object.values(opts).join(' ')}` : key,
  }),
}));

const VALID: PathCheckResult = { status: 'valid', gitRepoDetected: true };
const MISSING: PathCheckResult = {
  status: 'invalid',
  error: 'Local path does not exist',
  suggestion: '创建目录或重选',
  missing: true,
};

function renderInput(overrides?: Partial<Parameters<typeof PathInput>[0]>) {
  const onChange = vi.fn();
  const utils = render(
    <PathInput value="D:\\code\\demo" onChange={onChange} {...overrides} />,
  );
  return { onChange, ...utils };
}

afterEach(() => {
  delete (window as { __ORDO_DESKTOP__?: unknown }).__ORDO_DESKTOP__;
});

describe('PathInput（CAP-A-28 路径输入统一件）', () => {
  it('渲染受控值，手输变更回写 onChange', () => {
    const { onChange } = renderInput();
    const input = screen.getByDisplayValue('D:\\\\code\\\\demo');
    fireEvent.change(input, { target: { value: 'E:\\\\other' } });
    expect(onChange).toHaveBeenCalledWith('E:\\\\other');
  });

  it('纯 web（无壳桥）选择器入口隐藏——手输兜底', () => {
    renderInput({ onValidate: () => Promise.resolve(VALID) });
    expect(
      screen.queryByRole('button', { name: 'path-input.pickDirectory' }),
    ).not.toBeInTheDocument();
    // 验证动作仍可用
    expect(
      screen.getByRole('button', { name: 'path-input.action.validate' }),
    ).toBeEnabled();
  });

  it('桌面壳内渲染选择器按钮，选取目录后回写 onChange', async () => {
    const invokeMock = vi.fn().mockResolvedValue({ path: 'D:\\\\picked\\\\dir' });
    (window as { __ORDO_DESKTOP__?: unknown }).__ORDO_DESKTOP__ = {
      invoke: invokeMock,
    };
    const { onChange } = renderInput();

    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.pickDirectory' }),
    );
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'choose_directory',
        expect.objectContaining({ title: 'path-input.pickDirectory' }),
      );
    });
    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('D:\\\\picked\\\\dir');
    });
  });

  it('kind=file 走 choose_file 通道', async () => {
    const invokeMock = vi.fn().mockResolvedValue({ path: null });
    (window as { __ORDO_DESKTOP__?: unknown }).__ORDO_DESKTOP__ = {
      invoke: invokeMock,
    };
    renderInput({ kind: 'file' });

    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.pickFile' }),
    );
    await waitFor(() => {
      expect(invokeMock).toHaveBeenCalledWith(
        'choose_file',
        expect.anything(),
      );
    });
  });

  it('验证通过 → valid 徽标', async () => {
    const onValidate = vi.fn().mockResolvedValue(VALID);
    renderInput({ onValidate });

    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.action.validate' }),
    );
    await waitFor(() => {
      expect(onValidate).toHaveBeenCalledWith('D:\\\\code\\\\demo');
    });
    await waitFor(() => {
      expect(screen.getByText('path-input.status.valid')).toBeInTheDocument();
    });
  });

  it('验证 missing → invalid 徽标 + 「创建目录」动作出现并可执行', async () => {
    const onCreate = vi.fn().mockResolvedValue(VALID);
    renderInput({
      onValidate: () => Promise.resolve(MISSING),
      onCreate,
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.action.validate' }),
    );
    const createButton = await screen.findByRole('button', {
      name: 'path-input.action.create',
    });
    expect(screen.getByText('path-input.status.invalid')).toBeInTheDocument();
    expect(screen.getByText('Local path does not exist')).toBeInTheDocument();

    fireEvent.click(createButton);
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('D:\\\\code\\\\demo');
    });
  });

  it('验证动作抛错 → 保底报错原样呈现，绝不静默', async () => {
    renderInput({
      onValidate: () => Promise.reject(new Error('network down')),
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.action.validate' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'path-input.actionFailed',
    );
    expect(screen.getByText(/network down/)).toBeInTheDocument();
  });

  it('值变更后既有验证结果失效（徽标随之消失，防陈旧结论）', async () => {
    renderInput({ onValidate: () => Promise.resolve(MISSING) });

    fireEvent.click(
      screen.getByRole('button', { name: 'path-input.action.validate' }),
    );
    await screen.findByText('path-input.status.invalid');

    fireEvent.change(screen.getByDisplayValue('D:\\\\code\\\\demo'), {
      target: { value: 'E:\\\\new' },
    });
    expect(
      screen.queryByText('path-input.status.invalid'),
    ).not.toBeInTheDocument();
  });

  it('savedStatus 回显（无即时结果时）+ validatedAt 时间戳', () => {
    renderInput({
      savedStatus: 'invalid',
      savedValidatedAt: '2026-10-03T01:02:03Z',
    });
    expect(screen.getByText('path-input.status.invalid')).toBeInTheDocument();
    expect(screen.getByText(/path-input\.savedAt/)).toBeInTheDocument();
  });

  it('无验证能力且无回显时状态行整体省略', () => {
    renderInput();
    expect(screen.queryByText('path-input.status.unknown')).not.toBeInTheDocument();
  });
});
