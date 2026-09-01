/**
 * task：任务管理（列/查/建/改/认领/指派）
 */
import { Command } from 'commander';
import { ApmError } from '@apm/shared';
import { buildContext, out } from '../context';

export function registerTaskCommands(program: Command): void {
  const task = program.command('task').description('任务管理');

  task
    .command('list')
    .description('列出项目下的任务')
    .requiredOption('--project <id>', '项目 id')
    .option('--status <s>', '状态过滤')
    .option('--assignee <id>', '负责人过滤')
    .option('--page <n>', '页码', '1')
    .option('--page-size <n>', '每页数量', '20')
    .action(
      async (
        opts: { project: string; status?: string; assignee?: string; page: string; pageSize: string },
        cmd: Command,
      ) => {
        const ctx = buildContext(cmd);
        const data = await ctx.client.get(`/projects/${opts.project}/tasks`, {
          status: opts.status,
          assigneeId: opts.assignee,
          page: Number(opts.page),
          pageSize: Number(opts.pageSize),
        });
        out(ctx, data);
      },
    );

  task
    .command('show <id>')
    .description('查看任务详情')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/tasks/${id}`);
      out(ctx, data);
    });

  task
    .command('create')
    .description('创建任务')
    .requiredOption('--project <id>', '项目 id')
    .requiredOption('--title <t>', '任务标题')
    .option('--description <d>', '任务描述')
    .option('--status <s>', '初始状态')
    .option('--type <t>', '任务类型（task/bug）')
    .option('--module-code <CODE>', '模块代码（2-4 位大写字母）；缺省自动取项目第一个模块')
    .action(
      async (
        opts: { project: string; title: string; description?: string; status?: string; type?: string; moduleCode?: string },
        cmd: Command,
      ) => {
        const ctx = buildContext(cmd);
        let moduleCode = opts.moduleCode;
        if (!moduleCode) {
          const mods = (await ctx.client.get(`/projects/${opts.project}/modules`)) as
            | { items?: Array<{ code?: string }> }
            | Array<{ code?: string }>;
          const items = Array.isArray(mods) ? mods : mods?.items ?? [];
          moduleCode = items.find((m) => m.code)?.code;
          if (!moduleCode) {
            throw new ApmError(
              '项目没有可用模块，请用 --module-code <CODE> 指定模块代码（2-4 位大写字母）',
            );
          }
        }
        const body: Record<string, unknown> = {
          projectId: opts.project,
          title: opts.title,
          moduleCode,
        };
        if (opts.description) body.description = opts.description;
        if (opts.status) body.status = opts.status;
        if (opts.type) body.type = opts.type;
        const data = await ctx.client.post('/tasks', body);
        out(ctx, data);
      },
    );

  task
    .command('update <id>')
    .description('更新任务（状态/标题/描述）')
    .option('--status <s>', '新状态')
    .option('--title <t>', '新标题')
    .option('--description <d>', '新描述')
    .action(
      async (id: string, opts: { status?: string; title?: string; description?: string }, cmd: Command) => {
        const ctx = buildContext(cmd);
        const body: Record<string, unknown> = {};
        if (opts.status) body.status = opts.status;
        if (opts.title) body.title = opts.title;
        if (opts.description) body.description = opts.description;
        const data = await ctx.client.patch(`/tasks/${id}`, body);
        out(ctx, data);
      },
    );

  task
    .command('claim <id>')
    .description('认领任务（AI Worker）')
    .option('--agent <bindingId>', 'Agent 绑定 id')
    .action(async (id: string, opts: { agent?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const body: Record<string, unknown> = {};
      if (opts.agent) body.agentBindingId = opts.agent;
      const data = await ctx.client.post(`/tasks/${id}/claim`, body);
      out(ctx, data);
    });

  task
    .command('assign-agent <id>')
    .description('指派 Agent 执行任务')
    .requiredOption('--agent <bindingId>', 'Agent 绑定 id')
    .option('--provider <p>', 'CLI provider')
    .action(
      async (id: string, opts: { agent: string; provider?: string }, cmd: Command) => {
        const ctx = buildContext(cmd);
        const body: Record<string, unknown> = { agentBindingId: opts.agent };
        if (opts.provider) body.providerId = opts.provider;
        const data = await ctx.client.post(`/tasks/${id}/assign-agent`, body);
        out(ctx, data);
      },
    );
}
