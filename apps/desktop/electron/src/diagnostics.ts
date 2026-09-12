/**
 * 一键导出诊断包（ADR-015 支持排障最小闭环）：壳+server 日志、运行元数据、进程快照
 * 打 zip 供粘贴/上传。zip 经系统 PowerShell Compress-Archive——壳已 Windows-only，
 * 免引入压缩依赖。包内绝不含密钥与凭证（secrets.json、access_token 明确排除）。
 */
import { BrowserWindow, app, dialog } from 'electron';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AppConfig } from './config';
import { logger } from './logger';
import { getLogFilePath } from './logger';
import { loadDesktopState } from './desktop-state';
import { readWorkspaceRoots } from './runtime-daemon';

export interface DiagnosticsMetadata {
  appVersion: string;
  mode: 'development' | 'production';
  platform: string;
  osRelease: string;
  arch: string;
  electron: string;
  node: string;
  chrome: string;
  dataPath: string;
  logPath: string;
  uptimeSec: number;
  backendRunning: boolean;
  backendPort?: number;
  daemonRunning: boolean;
  daemonPid?: number;
  workspaceRoots: string[];
  /** 会话状态仅导出非敏感字段（token/工作区选择不进诊断包） */
  desktopStateFlags: Record<string, unknown>;
  processStats: unknown;
}

function collectMetadata(
  config: AppConfig,
  extra: {
    backend: { running: boolean; port?: number };
    daemon: { running: boolean; pid?: number };
    processStats: unknown;
  },
): DiagnosticsMetadata {
  // 仅取布尔/枚举类字段，token 类敏感键天然不进白名单
  const state = loadDesktopState(config.userDataDir);
  const desktopStateFlags: Record<string, unknown> = {
    onboarding_completed: state.onboarding_completed ?? null,
    close_to_tray: state.close_to_tray ?? null,
    has_access_token: !!state.access_token,
    has_workspace_selection: !!state['apm-workspace-id'],
  };
  return {
    appVersion: app.getVersion(),
    mode: config.nodeExe === null ? 'development' : 'production',
    platform: process.platform,
    osRelease: os.release(),
    arch: os.arch(),
    electron: process.versions.electron ?? '',
    node: process.versions.node,
    chrome: process.versions.chrome ?? '',
    dataPath: config.userDataDir,
    logPath: config.logsDir,
    uptimeSec: Math.round(process.uptime()),
    backendRunning: extra.backend.running,
    backendPort: extra.backend.port,
    daemonRunning: extra.daemon.running,
    daemonPid: extra.daemon.pid,
    workspaceRoots: readWorkspaceRoots(config),
    desktopStateFlags,
    processStats: extra.processStats,
  };
}

/** PowerShell Compress-Archive 打 zip（LiteralPath 防路径通配符注入）。 */
function compressStaging(stagingDir: string, zipPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `Compress-Archive -Path '${stagingDir}\\*' -DestinationPath '${zipPath}' -Force`;
    spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], {
      windowsHide: true,
    }).on('exit', (code) => {
      if (code === 0 && fs.existsSync(zipPath)) {
        resolve();
      } else {
        reject(new Error(`压缩诊断包失败（Compress-Archive exit=${code}）`));
      }
    });
  });
}

export async function exportDiagnostics(
  config: AppConfig,
  extra: Parameters<typeof collectMetadata>[1],
): Promise<{ path: string | null }> {
  const win = BrowserWindow.getAllWindows()[0];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: '导出诊断包',
    defaultPath: path.join(app.getPath('downloads'), `apm-diagnostics-${stamp}.zip`),
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  });
  if (canceled || !filePath) {
    return { path: null };
  }

  const staging = path.join(app.getPath('temp'), `apm-diagnostics-${Date.now()}`);
  try {
    fs.mkdirSync(staging, { recursive: true });
    const logFile = getLogFilePath();
    if (logFile && fs.existsSync(logFile)) {
      fs.copyFileSync(logFile, path.join(staging, 'desktop-main.log'));
    }
    fs.writeFileSync(
      path.join(staging, 'metadata.json'),
      JSON.stringify(collectMetadata(config, extra), null, 2),
    );
    await compressStaging(staging, filePath);
    logger.info(`诊断包已导出: ${filePath}`);
    return { path: filePath };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`诊断包导出失败: ${message}`);
    throw new Error(`诊断包导出失败: ${message}`);
  } finally {
    fs.rmSync(staging, { force: true, recursive: true });
  }
}
