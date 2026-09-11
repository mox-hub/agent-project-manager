/**
 * dev 冒烟辅助：经 CDP 验证渲染进程侧的 desktop IPC 契约。
 * 前置：electron 以 --remote-debugging-port=9222 启动，且窗口已加载前端。
 * 用法：node scripts/smoke-ipc.mjs
 */
const DEBUG_PORT = process.env.SMOKE_CDP_PORT ?? '9222';

const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page' && !t.url.startsWith('devtools'));
if (!page) {
  console.error('[smoke-ipc] 未找到应用页面 target:', targets.map((t) => t.type + ' ' + t.url));
  process.exit(1);
}

const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let seq = 0;
const pending = new Map();
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
};
function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = ++seq;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

await send('Runtime.enable');
const expression = `(async () => {
  const hasTauri = !!window.__TAURI__;
  if (!hasTauri) return { hasTauri };
  const appInfo = await window.__TAURI__.core.invoke('get_app_info');
  const backend = await window.__TAURI__.core.invoke('get_backend_status');
  const init = await window.__TAURI__.core.invoke('get_init_status');
  return { hasTauri, appInfo, backend, init };
})()`;

const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
const payload = result.result?.result?.value;
console.log(JSON.stringify(payload, null, 2));

const ok =
  payload?.hasTauri === true &&
  payload?.backend?.running === true &&
  typeof payload?.appInfo?.apiBaseUrl === 'string' &&
  payload?.appInfo?.apiBaseUrl.length > 0 &&
  payload?.init?.error === null;
console.log(ok ? '[smoke-ipc] PASS' : '[smoke-ipc] FAIL');
process.exit(ok ? 0 : 1);
