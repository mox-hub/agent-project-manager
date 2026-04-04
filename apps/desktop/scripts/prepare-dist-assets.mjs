import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const desktopDir = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(desktopDir, '../..');
const resourcesDir = path.join(desktopDir, 'resources');
const stagedServerDir = path.join(resourcesDir, 'server');
const stagedFrontendDir = path.join(resourcesDir, 'frontend');
const sourceServerDir = path.join(workspaceRoot, 'apps', 'server');
const sourceFrontendDir = path.join(workspaceRoot, 'apps', 'frontend');
const pnpmExecPath = process.env.npm_execpath;
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const require = createRequire(import.meta.url);

function runPnpm(title, args, cwd = workspaceRoot) {
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

function runCommand(title, command, args, cwd = workspaceRoot) {
  console.log(`\n[desktop] ${title}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function cleanAndEnsureDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyDir(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyPrismaGeneratedClient(sourceServerRoot, stagedServerRoot) {
  const prismaClientPkg = require.resolve('@prisma/client/package.json', {
    paths: [sourceServerRoot],
  });
  const prismaVirtualNodeModulesDir = path.dirname(
    path.dirname(path.dirname(prismaClientPkg)),
  );
  const sourceGeneratedDir = path.join(prismaVirtualNodeModulesDir, '.prisma');
  const targetGeneratedDir = path.join(stagedServerRoot, 'node_modules', '.prisma');

  if (!fs.existsSync(sourceGeneratedDir)) {
    throw new Error(
      `Prisma generated client directory is missing: ${sourceGeneratedDir}`,
    );
  }

  copyDir(sourceGeneratedDir, targetGeneratedDir);
}

runPnpm('Build server', [
  '-C',
  workspaceRoot,
  '--filter',
  './apps/server',
  'run',
  'build',
]);

runPnpm('Build frontend', [
  '-C',
  workspaceRoot,
  '--filter',
  './apps/frontend',
  'run',
  'build',
]);

cleanAndEnsureDir(resourcesDir);
cleanAndEnsureDir(stagedServerDir);
cleanAndEnsureDir(stagedFrontendDir);

console.log('\n[desktop] Stage server runtime assets');
copyDir(path.join(sourceServerDir, 'dist'), path.join(stagedServerDir, 'dist'));
copyDir(path.join(sourceServerDir, 'prisma'), path.join(stagedServerDir, 'prisma'));
copyFile(
  path.join(sourceServerDir, 'package.json'),
  path.join(stagedServerDir, 'package.json'),
);

fs.rmSync(path.join(stagedServerDir, 'node_modules'), {
  recursive: true,
  force: true,
});
fs.rmSync(path.join(stagedServerDir, 'package-lock.json'), { force: true });

runCommand(
  'Install server production dependencies into staged runtime (npm flat mode)',
  npmCmd,
  ['install', '--omit=dev', '--no-audit', '--no-fund', '--legacy-peer-deps'],
  stagedServerDir,
);

console.log('\n[desktop] Copy Prisma generated client artifacts');
copyPrismaGeneratedClient(sourceServerDir, stagedServerDir);

console.log('\n[desktop] Stage frontend dist assets');
copyDir(path.join(sourceFrontendDir, 'dist'), stagedFrontendDir);

console.log('\n[desktop] Dist assets prepared');
