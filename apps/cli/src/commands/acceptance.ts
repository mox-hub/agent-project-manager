/**
 * acceptance：验收管理（验收单/标准/接收/驳回/校验/审计）
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

export function registerAcceptanceCommands(program: Command): void {
  const acceptance = program.command('acceptance').description('验收管理');

  acceptance
    .command('list')
    .description('列出验收单')
    .option('--project <id>', '项目 id')
    .option('--status <s>', '状态过滤')
    .action(async (opts: { project?: string; status?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const query: Record<string, unknown> = {};
      if (opts.project) query.projectId = opts.project;
      if (opts.status) query.status = opts.status;
      const data = await ctx.client.get('/acceptance', query);
      out(ctx, data);
    });

  acceptance
    .command('show <id>')
    .description('查看验收详情')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/acceptance/${id}`);
      out(ctx, data);
    });

  acceptance
    .command('criteria <id>')
    .description('查看验收标准')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/acceptance/${id}/criteria`);
      out(ctx, data);
    });

  acceptance
    .command('validate <id>')
    .description('校验完成状态')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/acceptance/${id}/validate-completion`);
      out(ctx, data);
    });

  acceptance
    .command('accept <id>')
    .description('接收完成（人工接收）')
    .option('--note <n>', '接收说明')
    .action(async (id: string, opts: { note?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/acceptance/${id}/accept-completion`, {
        note: opts.note,
      });
      out(ctx, data);
    });

  acceptance
    .command('reject <id>')
    .description('驳回完成')
    .option('--note <n>', '驳回原因')
    .action(async (id: string, opts: { note?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/acceptance/${id}/reject-completion`, {
        note: opts.note,
      });
      out(ctx, data);
    });

  acceptance
    .command('audit <id>')
    .description('运行完整性审计并获取报告')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.post(`/acceptance/${id}/audit`);
      out(ctx, data);
    });
}
