/**
 * execution：执行记录与审批
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

export function registerExecutionCommands(program: Command): void {
  const execution = program.command('execution').description('执行与审批');

  // ---- 执行记录 ----
  const run = execution.command('run').description('执行记录');

  run
    .command('list')
    .description('列出执行记录')
    .option('--project <id>', '项目 id')
    .option('--page <n>', '页码', '1')
    .option('--page-size <n>', '每页数量', '20')
    .action(
      async (opts: { project?: string; page: string; pageSize: string }, cmd: Command) => {
        const ctx = buildContext(cmd);
        const query: Record<string, unknown> = {
          page: Number(opts.page),
          pageSize: Number(opts.pageSize),
        };
        if (opts.project) query.projectId = opts.project;
        const data = await ctx.client.get('/execution/runs', query);
        out(ctx, data);
      },
    );

  run
    .command('show <id>')
    .description('查看执行详情')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/execution/runs/${id}`);
      out(ctx, data);
    });

  run
    .command('start <id>')
    .description('开始执行')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/execution/runs/${id}/start`);
      out(ctx, data);
    });

  run
    .command('complete <id>')
    .description('标记执行完成')
    .option('--summary <s>', '完成摘要')
    .action(async (id: string, opts: { summary?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/execution/runs/${id}/complete`, {
        summary: opts.summary,
      });
      out(ctx, data);
    });

  run
    .command('fail <id>')
    .description('标记执行失败')
    .option('--error <e>', '错误信息')
    .action(async (id: string, opts: { error?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/execution/runs/${id}/fail`, {
        error: opts.error,
      });
      out(ctx, data);
    });

  run
    .command('cancel <id>')
    .description('取消执行')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/execution/runs/${id}/cancel`);
      out(ctx, data);
    });

  // ---- 审批 ----
  const approval = execution.command('approval').description('审批');

  approval
    .command('list')
    .description('列出审批请求')
    .option('--project <id>', '项目 id')
    .option('--status <s>', '状态过滤（pending/resolved）')
    .action(async (opts: { project?: string; status?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const query: Record<string, unknown> = {};
      if (opts.project) query.projectId = opts.project;
      if (opts.status) query.status = opts.status;
      const data = await ctx.client.get('/execution/approvals', query);
      out(ctx, data);
    });

  approval
    .command('resolve <id>')
    .description('审批决议（通过或拒绝）')
    .option('--approve', '批准')
    .option('--reject', '拒绝')
    .option('--note <n>', '决议说明')
    .action(
      async (id: string, opts: { approve?: boolean; reject?: boolean; note?: string }, cmd: Command) => {
        const ctx = buildContext(cmd);
        const resolution = opts.approve ? 'approved' : opts.reject ? 'rejected' : 'approved';
        const data = await ctx.client.post(`/execution/approvals/${id}/resolve`, {
          resolution,
          resolutionNote: opts.note,
        });
        out(ctx, data);
      },
    );
}
