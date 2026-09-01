/**
 * document：文档管理（文档/章节/标签）
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

export function registerDocumentCommands(program: Command): void {
  const document = program.command('document').description('文档管理');

  document
    .command('list')
    .description('列出文档')
    .option('--project <id>', '项目 id')
    .option('--keyword <kw>', '关键字过滤')
    .action(async (opts: { project?: string; keyword?: string }, cmd: Command) => {
      const ctx = buildContext(cmd);
      const query: Record<string, unknown> = {};
      if (opts.project) query.projectId = opts.project;
      if (opts.keyword) query.keyword = opts.keyword;
      const data = await ctx.client.get('/documents', query);
      out(ctx, data);
    });

  document
    .command('show <id>')
    .description('查看文档详情')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/documents/${id}`);
      out(ctx, data);
    });

  document
    .command('sections <id>')
    .description('查看文档章节树')
    .action(async (id: string, _o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get(`/documents/${id}/sections`);
      out(ctx, data);
    });

  document
    .command('tags')
    .description('列出文档标签')
    .action(async (_o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const data = await ctx.client.get('/documents/tags');
      out(ctx, data);
    });
}
