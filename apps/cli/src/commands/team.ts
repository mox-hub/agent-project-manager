/**
 * team：团队与成员管理
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

export function registerTeamCommands(program: Command): void {
  const team = program.command('team').description('团队与成员管理');

  team
    .command('list')
    .description('列出团队')
    .action(async (_o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get('/teams');
      out(ctx, data);
    });

  team
    .command('show <id>')
    .description('查看团队详情')
    .option('--members', '同时列出成员')
    .action(async (id: string, opts: { members?: boolean }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/teams/${id}`);
      if (opts.members) {
        const members = await ctx.client.get(`/teams/${id}/members`);
        out(ctx, { ...(data as object), members });
        return;
      }
      out(ctx, data);
    });

  team
    .command('add-member <id>')
    .description('添加成员到团队')
    .requiredOption('--member <memberId>', '成员 id（Member）')
    .option('--role <r>', '角色（member/maintainer/admin）')
    .action(
      async (id: string, opts: { member: string; role?: string }, cmd: Command) => {
        const ctx = buildContext(cmd);
        const body: Record<string, unknown> = { memberId: opts.member };
        if (opts.role) body.role = opts.role;
        const data = await ctx.client.post(`/teams/${id}/members`, body);
        out(ctx, data);
      },
    );
}
