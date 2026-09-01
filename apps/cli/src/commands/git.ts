/**
 * git：Git 仓库管理（仓库/状态/分支/提交/命令）
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

export function registerGitCommands(program: Command): void {
  const git = program.command('git').description('Git 仓库管理');

  git
    .command('repos')
    .description('列出仓库')
    .option('--project <id>', '项目 id')
    .action(async (opts: { project?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const query: Record<string, unknown> = {};
      if (opts.project) query.projectId = opts.project;
      const data = await ctx.client.get('/git/repos', query);
      out(ctx, data);
    });

  git
    .command('status <repoId>')
    .description('仓库工作区状态')
    .action(async (repoId: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/git/repos/${repoId}/status`);
      out(ctx, data);
    });

  git
    .command('branches <repoId>')
    .description('仓库分支列表')
    .action(async (repoId: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/git/repos/${repoId}/branches`);
      out(ctx, data);
    });

  git
    .command('commits <repoId>')
    .description('仓库提交记录')
    .option('--limit <n>', '数量限制', '20')
    .action(async (repoId: string, opts: { limit: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/git/repos/${repoId}/commits`, {
        limit: Number(opts.limit),
      });
      out(ctx, data);
    });

  git
    .command('command <repoId>')
    .description('在仓库内执行 git 命令（经后端白名单校验）')
    .requiredOption('--cmd <command>', 'git 子命令，如 status / diff')
    .action(
      async (repoId: string, opts: { cmd: string }, cmd: Command) => {
        const ctx = buildContext(cmd);
        const data = await ctx.client.post(`/git/repos/${repoId}/commands/execute`, {
          command: opts.cmd,
        });
        out(ctx, data);
      },
    );
}
