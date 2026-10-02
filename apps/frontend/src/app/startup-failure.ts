/**
 * 启动失败屏（原生 DOM，不依赖 React / i18n 已就绪）。
 *
 * 使用场景：桌面壳内 `restoreDesktopSession()` 未就绪（壳侧后端地址未知，本地服务
 * 未启动或正在重启）。此时**不能**照常挂载路由——未钉底时任何请求都会落到未知后端
 * （`/_api` → Vite 代理默认端口 4300 常被上一代僵尸后端占用），有效会话会被陈旧实例
 * 判 401、清登录态并踢回登录页。宁可显式报错 + 重试，也不带病进入应用。
 *
 * 文案刻意硬编码中文：该屏的触发条件之一是 i18n/资源加载链路本身异常，走 i18n 反而
 * 可能在最需要提示时拿不到文案。
 */
export function renderStartupFailure(detail?: string): void {
  const container = document.createElement('div');
  container.setAttribute('role', 'alert');
  container.style.cssText =
    'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;height:100vh;padding:24px;text-align:center;font-family:system-ui,sans-serif;';

  const title = document.createElement('p');
  title.style.cssText = 'margin:0;font-size:14px;';
  title.textContent = '本地服务未就绪，无法确定后端地址。';

  const hint = document.createElement('p');
  hint.style.cssText = 'margin:0;font-size:12px;opacity:.7;';
  hint.textContent = detail ?? '请稍候重试，或从托盘重新打开应用。';

  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = '重试';
  retry.style.cssText =
    'padding:6px 14px;font-size:13px;border:1px solid currentColor;border-radius:6px;background:transparent;cursor:pointer;';
  retry.addEventListener('click', () => window.location.reload());

  container.append(title, hint, retry);
  document.body.replaceChildren(container);
}
