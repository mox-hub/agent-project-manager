/**
 * mcp：为外部 AI 客户端（Claude Desktop / Codex 等）生成 apm MCP server 配置
 */
import { Command } from 'commander';
import {
  ApmError,
  RUNTIME_ENDPOINTS,
  RuntimeRegisterPayload,
  RuntimeRegistrationResult,
} from '@apm/shared';
import { buildContext, out } from '../context';

export function registerMcpCommands(program: Command): void {
  const mcp = program.command('mcp').description('MCP 集成（对外 MCP server 配置）');

  mcp
    .command('config')
    .description('生成 apm MCP server 接入配置（mcpServers.apm）')
    .option('--project <id>', '项目 id（生成项目上下文配置）')
    .option('--runtime-token <token>', '复用已有 runtime session token')
    .action(
      async (
        opts: { project?: string; runtimeToken?: string },
        cmd: Command,
      ) => {
        const ctx = buildContext(cmd);

        let token = opts.runtimeToken || ctx.config.daemon?.runtimeSessionToken;
        if (!token) {
          // 临时注册一个 runtime 获取 MCP 握手 token
          const reg = await ctx.client.post<RuntimeRegistrationResult>(
            RUNTIME_ENDPOINTS.REGISTER,
            {
              runtimeId: `mcp-cli-${Date.now().toString(36)}`,
              deviceId: 'cli',
              hostPlatform: process.platform,
              runtimeVersion: '0.1.0',
              protocolVersion: '1.0.0',
              workspaceRoots: [],
              availableProviders: [],
              cliProviders: [],
            } as RuntimeRegisterPayload,
          );
          token = reg.runtimeSessionToken;
        }
        if (!token) {
          throw new ApmError('无法获取 MCP 握手 token');
        }

        const base = ctx.backend.replace(/\/+$/, '');
        const sessionId = opts.project
          ? `mcp_project_${opts.project}`
          : 'mcp_runtime_default';
        const url = `${base}/_api/mcp/sse?sessionId=${encodeURIComponent(
          sessionId,
        )}&token=${encodeURIComponent(token)}`;

        const config = {
          mcpServers: {
            apm: {
              type: 'http' as const,
              url,
              headers: opts.project ? { 'x-project-id': opts.project } : {},
            },
          },
        };
        out(ctx, config);
      },
    );
}
