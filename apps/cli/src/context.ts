/**
 * CLI 上下文构建：解析全局参数 → 组装 ApmClient
 */
import { Command } from 'commander';
import { inspect } from 'util';
import {
  ApmClient,
  ApmError,
  ApmConfig,
  ExitCode,
  getActiveProfileName,
  getBackend,
  getProfile,
  readConfig,
} from '@apm/shared';

export interface CliContext {
  backend: string;
  workspaceId?: string;
  profileName: string;
  json: boolean;
  client: ApmClient;
  config: ApmConfig;
}

export function buildContext(cmd: Command): CliContext {
  const root = cmd.optsWithGlobals() as {
    backend?: string;
    workspace?: string;
    json?: boolean;
    profile?: string;
  };

  const config = readConfig();
  const backend = getBackend(config, root.backend);
  if (!backend) {
    throw new ApmError(
      '未配置后端地址。请先执行 apm config set backend <url>，或用 --backend <url> 指定',
      ExitCode.BACKEND_UNREACHABLE,
    );
  }

  const profileName = root.profile || getActiveProfileName(config);
  const profile = getProfile(config, profileName);
  const workspaceId = root.workspace || profile.workspaceId;

  const client = new ApmClient({
    backend,
    workspaceId,
    getToken: () => profile.accessToken,
  });

  return {
    backend,
    workspaceId,
    profileName,
    json: !!root.json,
    client,
    config,
  };
}

/** 人读输出：json 模式打印原始 JSON，否则以可读缩进展示 */
export function out(ctx: CliContext, data: unknown, fallback?: string): void {
  if (ctx.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }
  if (data === null || data === undefined) {
    console.log(fallback ?? '(无数据)');
    return;
  }
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    console.log(String(data));
    return;
  }
  console.log(inspect(data, { depth: null, colors: process.stdout.isTTY, maxArrayLength: 100 }));
}
