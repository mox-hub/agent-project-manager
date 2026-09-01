/**
 * api：通用透传命令（324 端点兜底）
 *   apm api <method> <path> [json]
 *   apm api GET /tasks '{"projectId":"p1"}'
 */
import { Command } from 'commander';
import { ApmError } from '@apm/shared';
import { buildContext, out } from '../context';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export function registerApiCommands(program: Command): void {
  program
    .command('api')
    .description(
      '通用透传：直接调用后端 REST 端点（方法 路径 [JSON body]）。Git Bash 下路径请用 ./ 或 // 前缀，如 ./tasks',
    )
    .argument('<method>', 'HTTP 方法 GET/POST/PUT/PATCH/DELETE')
    .argument('<path>', '端点路径（如 ./tasks 或 ./_api/tasks）')
    .argument('[json]', 'JSON body（非 GET 时）')
    .option('--query <json>', '查询参数 JSON 对象，如 {"projectId":"p1"}')
    .action(
      async (
        method: string,
        path: string,
        json: string | undefined,
        opts: { query?: string },
        cmd: Command,
      ) => {
        const ctx = buildContext(cmd);
        const m = method.toUpperCase();
        if (!METHODS.includes(m)) {
          throw new ApmError(`不支持的 HTTP 方法：${m}`);
        }
        const body = json ? JSON.parse(json) : undefined;
        const query = opts.query ? JSON.parse(opts.query) : undefined;
        const data = await ctx.client.request(m, path, body, query);
        out(ctx, data);
      },
    );
}
