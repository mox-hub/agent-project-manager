import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PromptProvider, usePrompt } from './prompt-provider';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

type PromptFnOptions = Parameters<ReturnType<typeof usePrompt>>[0];

/** 测试挂载点：点按钮唤起 prompt，结果三分态展示（未 resolve / 取消 / 输入值） */
function StatefulHarness({ options }: { options: PromptFnOptions }) {
  const prompt = usePrompt();
  const [status, setStatus] = useState<'idle' | 'resolved'>('idle');
  const [result, setResult] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          prompt(options).then((value) => {
            setResult(value);
            setStatus('resolved');
          });
        }}
      >
        打开输入框
      </button>
      <output data-testid="prompt-result">
        {status === 'idle' ? 'idle' : result === null ? 'cancelled' : result}
      </output>
    </>
  );
}

function renderPrompt(options: PromptFnOptions) {
  return render(
    <PromptProvider>
      <StatefulHarness options={options} />
    </PromptProvider>,
  );
}

async function openPrompt() {
  fireEvent.click(screen.getByText('打开输入框'));
  return screen.findByRole('textbox');
}

describe('PromptProvider —— 命令式输入对话框', () => {
  it('输入标题后确认：resolve 输入原文，对话框关闭', async () => {
    renderPrompt({ title: '创建子任务' });

    const input = await openPrompt();
    fireEvent.change(input, { target: { value: '登录页适配暗色主题' } });
    fireEvent.click(screen.getByText('common.confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('prompt-result').textContent).toBe('登录页适配暗色主题');
    });
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('取消按钮：resolve null，不返回输入内容', async () => {
    renderPrompt({ title: '创建子任务' });

    const input = await openPrompt();
    fireEvent.change(input, { target: { value: '草稿' } });
    fireEvent.click(screen.getByText('common.cancel'));

    await waitFor(() => {
      expect(screen.getByTestId('prompt-result').textContent).toBe('cancelled');
    });
  });

  it('对话框自带关闭按钮：同样 resolve null', async () => {
    renderPrompt({ title: '创建父任务' });

    await openPrompt();
    const closeBtn = document.querySelector('[data-slot="dialog-close"]');
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn as Element);

    await waitFor(() => {
      expect(screen.getByTestId('prompt-result').textContent).toBe('cancelled');
    });
  });

  it('initialValue 预填输入框，确认时原样返回（裁剪交给调用方）', async () => {
    renderPrompt({ title: '重命名', initialValue: '  带空格  ' });

    await openPrompt();
    fireEvent.click(screen.getByText('common.confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('prompt-result').textContent).toBe('  带空格  ');
    });
  });

  it('placeholder 透传输入框', async () => {
    renderPrompt({ title: '创建子任务', placeholder: '子任务标题' });

    await openPrompt();
    expect(screen.getByPlaceholderText('子任务标题')).toBeTruthy();
  });

  it('Provider 外调用 usePrompt 抛错（与 useConfirm 同一契约）', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    function Bare() {
      usePrompt();
      return null;
    }
    expect(() => render(<Bare />)).toThrow('usePrompt must be used within PromptProvider');
    spy.mockRestore();
  });
});
