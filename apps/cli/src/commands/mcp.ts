/**
 * mcp：为外部 AI 客户端（Claude Desktop / Codex 等）生成 apm MCP server 配置
 *
 * P0-6 收口后 MCP 通道只认 PAT（apm_pat_ 前缀，?token= 建连时经
 * AccessTokenService.validate 校验）；runtime session token / JWT 直连会 401。
 * 因此本命令只生成 PAT 通道配置：无可用 PAT 时输出创建指引，绝不生成连不上的配置。
 */
import { Command } from 'commander';
import { ApmError, ExitCode } from '@apm/shared';
import { buildContext, out } from '../context';

/** 无 PAT 时的创建指引（保底形态：输出路径与命令，不自动生成凭据） */
function printPatGuide(backend: string): void {
  const base = backend.replace(/\/+$/, '');
  console.error(
    [
      '',
      'MCP 通道需要访问令牌（PAT，apm_pat_ 前缀）。runtime session token / 登录 JWT 直连 MCP 会 401（P0-6 收口）。',
      '创建 PAT（二选一）：',
      `  1. Web 控制面：设置 → 访问令牌（${base}/app/settings/tokens），新建后复制明文 token（仅显示一次）`,
      `  2. CLI（需已 apm login）：apm api POST /auth/tokens '{"name":"mcp"}'，取返回中的 token 字段`,
      '',
      "然后重新生成配置：apm mcp config --pat <你的PAT>",
      '',
    ].join('\n'),
  );
}

export function registerMcpCommands(program: Command): void {
  const mcp = program.command('mcp').description('MCP 集成（对外 MCP server 配置）');

  mcp
    .command('config')
    .description(
      '生成 apm MCP server 接入配置（mcpServers.apm）。MCP 通道需 PAT：无 --pat 时输出创建指引（runtime token 通道已废弃，直连 401）',
    )
    .option('--project <id>', '项目 id（生成项目上下文配置）')
    .option('--pat <token>', 'MCP 通道访问令牌（PAT，apm_pat_ 前缀；设置页或 apm api POST /auth/tokens 创建）')
    .action(
      async (
        opts: { project?: string; pat?: string },
        cmd: Command,
      ) => {
        const ctx = buildContext(cmd);

        const token = opts.pat;
        if (!token) {
          printPatGuide(ctx.backend);
          throw new ApmError(
            '未提供 PAT：请用 --pat <token> 传入访问令牌（创建方式见上方指引）',
            ExitCode.AUTH,
          );
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
