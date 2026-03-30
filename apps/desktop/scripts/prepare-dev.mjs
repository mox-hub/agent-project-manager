import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../../..');
const pnpmExecPath = process.env.npm_execpath;
const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function runStep(title, args, cwd = workspaceRoot) {
  console.log(`\n[desktop] ${title}`);
  const result = pnpmExecPath
    ? spawnSync(process.execPath, [pnpmExecPath, ...args], {
        cwd,
        stdio: 'inherit',
        env: process.env,
      })
    : spawnSync(pnpmCmd, args, {
        cwd,
        stdio: 'inherit',
        env: process.env,
      });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

runStep('Build server', [
  '-C',
  workspaceRoot,
  '--filter',
  './apps/server',
  'run',
  'build',
]);

runStep('Build frontend', [
  '-C',
  workspaceRoot,
  '--filter',
  './apps/frontend',
  'run',
  'build',
]);
