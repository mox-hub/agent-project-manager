/**
 * runtime：运行时与 CLI Provider 状态
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

export function registerRuntimeCommands(program: Command): void {
  const runtime = program.command('runtime').description('运行时与 CLI Provider');

  runtime
    .command('providers')
    .description('列出本机可用 CLI provider')
    .action(async (_o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get('/ai/cli-providers');
      out(ctx, data);
    });

  runtime
    .command('providers:detect')
    .description('重新探测本机 CLI provider')
    .action(async (_o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post('/cli-providers/detect');
      out(ctx, data);
    });

  runtime
    .command('status')
    .description('守护进程与远端 runtime 状态')
    .action(async (_o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      // 本地守护进程状态来自配置文件；远端注册信息经 control 面查询
      const local = ctx.config.daemon ?? null;
      const body: Record<string, unknown> = { localDaemon: local };
      out(ctx, body);
    });
}
