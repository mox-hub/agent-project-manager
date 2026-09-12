/**
 * 桌面壳 e2e 冒烟（ADR-015 壳级测试工程）：Playwright _electron 拉起真实壳进程，
 * 断言窗口生命周期与 IPC 契约，替代纯 CDP 取证的 smoke-ipc.mjs（后者保留作排障工具）。
 * 隔离：APM_DATA_DIR 指向临时目录——不污染真实 ~/.apm；断言 dataPath 与之精确一致。
 * 覆盖：窗口出现 → get_app_info（数据根/首装标记/模式）→ desktop-state 读写 →
 * 更新命令（dev 恒 idle）→ 优雅退出（子进程清理在 before-quit）。
 * 运行：pnpm --filter desktop build:electron && pnpm --filter desktop e2e:shell
 * （server 拉起为真实链路但断言不依赖其健康，数据库初始化在临时目录内异步完成）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');
const require = createRequire(path.join(repoRoot, 'apps', 'frontend', 'package.json'));
const { _electron } = require('@playwright/test');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-e2e-'));
let failures = 0;

function check(name, condition, detail = '') {
  const ok = !!condition;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) {
    failures += 1;
  }
}

const app = await _electron.launch({
  args: ['.'],
  cwd: desktopRoot,
  env: { ...process.env, APM_DATA_DIR: dataDir, APM_DESKTOP_DEBUG: undefined },
});
try {
  const win = await app.firstWindow();
  check('窗口出现', !!win, win ? await win.title() : '');

  /** 渲染进程经 preload 桥调用主进程命令面（与生产前端同一条链路） */
  const invoke = (cmd, args) =>
    win.evaluate(
      ([cmd, args]) => window.__TAURI__.core.invoke(cmd, args),
      [cmd, args],
    );

  const info = await invoke('get_app_info');
  check('get_app_info.dataPath = 临时数据目录', info.dataPath === dataDir, info.dataPath);
  check('get_app_info.isFirstInstall = true（干净目录）', info.isFirstInstall === true);
  check('get_app_info.mode = development', info.mode === 'development');
  check('get_app_info 带版本号', typeof info.version === 'string' && info.version.length > 0);

  const saved = await invoke('set_desktop_state', { close_to_tray: false });
  check('desktop-state 写入 close_to_tray', saved.close_to_tray === false);
  const reloaded = await invoke('get_desktop_state');
  check('desktop-state 读回一致', reloaded.close_to_tray === false);

  const update = await invoke('check_updates');
  check('dev 模式更新检查恒 idle', update.state === 'idle', JSON.stringify(update));

  const status = await invoke('get_backend_status');
  check('get_backend_status 返回形状', typeof status.running === 'boolean');
} finally {
  await app.close();
  const leftover = fs.existsSync(dataDir);
  if (leftover) {
    try {
      fs.rmSync(dataDir, { recursive: true, force: true });
    } catch {
      console.log(`NOTE 临时数据目录未清尽（server 异步初始化持有句柄）: ${dataDir}`);
    }
  }
}

console.log(failures === 0 ? '\ne2e-shell ALL PASS' : `\ne2e-shell ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
