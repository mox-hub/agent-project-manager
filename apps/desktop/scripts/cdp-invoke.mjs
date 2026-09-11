/**
 * 调试辅助：经 CDP 手动触发指定 desktop 命令并打印结果。
 * 用法：node.exe scripts/cdp-invoke.mjs <command> [jsonArgs]
 */
const DEBUG_PORT = process.env.SMOKE_CDP_PORT ?? '9222';
const cmd = process.argv[2];
const args = process.argv[3] ? JSON.parse(process.argv[3]) : undefined;
if (!cmd) {
  console.error('用法: node.exe scripts/cdp-invoke.mjs <command>');
  process.exit(1);
}

const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
const page = targets.find((t) => t.type === 'page');
if (!page) {
  console.error('未找到页面 target');
  process.exit(1);
}
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    pend.get(m.id)(m);
    pend.delete(m.id);
  }
};
const send = (method, params) =>
  new Promise((r) => {
    const i = ++id;
    pend.set(i, r);
    ws.send(JSON.stringify({ id: i, method, params }));
  });

const result = await send('Runtime.evaluate', {
  expression: `window.__TAURI__.core.invoke(${JSON.stringify(cmd)}, ${JSON.stringify(args)}).then(v => JSON.stringify(v)).catch(e => 'ERR: ' + (e.message ?? e))`,
  awaitPromise: true,
  returnByValue: true,
});
console.log(result.result?.result?.value);
process.exit(0);
