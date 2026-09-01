/**
 * project：项目管理
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

export function registerProjectCommands(program: Command): void {
  const project = program.command('project').description('项目管理');

  project
    .command('list')
    .description('列出项目（分页）')
    .option('--keyword <kw>', '关键字过滤')
    .option('--page <n>', '页码', '1')
    .option('--page-size <n>', '每页数量', '20')
    .action(async (opts: { keyword?: string; page: string; pageSize: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get('/projects', {
        keyword: opts.keyword,
        page: Number(opts.page),
        pageSize: Number(opts.pageSize),
      });
      out(ctx, data);
    });

  project
    .command('show <id>')
    .description('查看项目详情')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/projects/${id}`);
      out(ctx, data);
    });

  project
    .command('create')
    .description('创建项目')
    .requiredOption('--name <name>', '项目名称')
    .option('--type <t>', '类型 personal/team/experiment/enterprise', 'team')
    .option('--visibility <v>', '可见性 private/internal/public', 'private')
    .option('--code <c>', '项目编码（projectCode）')
    .option('--description <desc>', '项目描述')
    .action(
      async (
        opts: { name: string; type: string; visibility: string; code?: string; description?: string },
        cmd: Command,
      ) => {
        const ctx = buildContext(cmd);
        const body: Record<string, unknown> = {
          name: opts.name,
          type: opts.type,
          visibility: opts.visibility,
        };
        if (opts.code) body.projectCode = opts.code;
        if (opts.description) body.description = opts.description;
        const data = await ctx.client.post('/projects', body);
        out(ctx, data);
      },
    );

  project
    .command('archive <id>')
    .description('归档项目')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/projects/${id}/archive`);
      out(ctx, data);
    });
}
