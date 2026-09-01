/**
 * workspace：工作区列表 / 切换 / 创建
 */
import { Command } from 'commander';
import { getProfile, writeConfig } from '@apm/shared';
import { buildContext, out } from '../context';

export function registerWorkspaceCommands(program: Command): void {
  const workspace = program
    .command('workspace')
    .description('工作区管理（数据隔离：x-workspace-id 路由到不同 SQLite 库）');

  workspace
    .command('list')
    .description('列出可用工作区')
    .action(async (_opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get<unknown>('/workspaces');
      out(ctx, data);
    });

  workspace
    .command('use <id>')
    .description('切换当前工作区')
    .action(async (id: string, _opts, cmd: Command) => {
      const ctx = buildContext(cmd);
      // 激活（Public 端点，失败不阻断本地切换）
      try {
        await ctx.client.post(`/workspaces/${id}/activate`);
      } catch {
        // 忽略激活失败，仅写配置
      }
      const profile = getProfile(ctx.config, ctx.profileName);
      profile.workspaceId = id;
      writeConfig(ctx.config);
      console.log(`已切换工作区：${id}`);
    });

  workspace
    .command('create <name>')
    .description('创建工作区（admin）')
    .option('--path <dir>', '工作区目录（含 data/apm.db 模板）')
    .action(async (name: string, opts: { path?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const body: Record<string, unknown> = { name };
      if (opts.path) body.path = opts.path;
      const data = await ctx.client.post('/workspaces', body);
      out(ctx, data, `工作区已创建`);
    });
}
