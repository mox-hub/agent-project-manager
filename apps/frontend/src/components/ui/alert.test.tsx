import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert';

/**
 * D14 测试基线（宪法 §18）。alert 引用数 21，P2「装配原语」。
 *
 * Alert 的价值一半在语义：它是 `role="alert"` 的实时区域（屏幕阅读器会朗读），
 * 所以本文件把「role 存在 + 标题/描述/动作都在同一个 alert 区域内」作为硬断言；
 * variant 差异属样式（§18.2 不断言 className）。
 */
function renderAlert(variant?: 'default' | 'destructive') {
  return render(
    <Alert variant={variant}>
      <AlertTitle>同步失败</AlertTitle>
      <AlertDescription>远端仓库不可达，请检查网络后重试。</AlertDescription>
      <AlertAction>
        <button type="button">重试</button>
      </AlertAction>
    </Alert>,
  );
}

describe('Alert 语义与插槽', () => {
  it('暴露 role=alert（实时区域），默认变体', () => {
    renderAlert();

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('variant=destructive 仍是同一个 alert 实时区域（不因配色降级语义）', () => {
    renderAlert('destructive');

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('标题与描述落在 alert 区域内（朗读范围完整）', () => {
    renderAlert();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('同步失败');
    expect(alert).toHaveTextContent('远端仓库不可达，请检查网络后重试。');
  });

  it('AlertAction 内的重试按钮可被可访问名定位（不靠颜色暗示）', () => {
    renderAlert('destructive');

    const retry = screen.getByRole('button', { name: '重试' });
    expect(retry).toBeEnabled();
    expect(screen.getByRole('alert')).toContainElement(retry);
  });

  it('纯文本 Alert（无标题插槽）不产生空标题节点', () => {
    render(<Alert>仅一句话提示</Alert>);

    expect(screen.getByRole('alert')).toHaveTextContent('仅一句话提示');
    expect(screen.getByRole('alert').querySelector('[data-slot="alert-title"]')).toBeNull();
  });

  it('透传原生属性与 data-ai-* 标注（§12）', () => {
    render(
      <Alert data-ai-component="ui.alert" data-ai-role="error">
        <AlertTitle>错误</AlertTitle>
      </Alert>,
    );

    expect(screen.getByRole('alert')).toHaveAttribute('data-ai-role', 'error');
  });
});
