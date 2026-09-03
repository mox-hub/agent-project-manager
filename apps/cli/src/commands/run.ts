/**
 * run：派发任务给 CLI 执行（走现有 /ai/tasks/:id/dispatch-cli），可 --watch 轮询
 */
import { Command } from 'commander';
import { buildContext, out } from '../context';

interface DispatchResult {
  executionRunId?: string;
  status?: string;
  auditWarning?: string;
}

async function pollStatus(
  ctx: ReturnType<typeof buildContext>,
  executionRunId: string,
  maxSeconds: number,
): Promise<void> {
  const deadline = Date.now() + maxSeconds * 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const data = (await ctx.client.get(
      `/ai/execution-runs/${executionRunId}/status`,
    )) as { status?: string; isRunning?: boolean };
    console.log(`[${new Date().toISOString()}] 状态: ${data.status ?? 'unknown'}`);
    if (!data.isRunning && data.status && data.status !== 'dispatched') {
      out(ctx, data);
      return;
    }
    if (Date.now() > deadline) {
      console.error('轮询超时');
      return;
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
}

export function registerRunCommand(program: Command): void {
  program
    .command('run')
    .description('派发任务给 CLI 执行（需本机已装对应 CLI，如 claude-code）')
    .requiredOption('--task <id>', '任务 id')
    .option('--provider <p>', 'CLI provider（claude-code/codex/zcode）', 'claude-code')
    .option('--model <m>', '模型覆盖')
    .option('--agent-binding <id>', 'Agent 绑定 id')
    .option('--timeout <ms>', '执行超时（毫秒）')
    .option('--watch', '派发后轮询执行状态')
    .option('--watch-timeout <s>', '轮询最大秒数', '600')
    .action(
      async (
        opts: {
          task: string;
          provider: string;
          model?: string;
          agentBinding?: string;
          timeout?: string;
          watch?: boolean;
          watchTimeout: string;
        },
        cmd: Command,
      ) => {
        const ctx = buildContext(cmd);
        const body: Record<string, unknown> = { providerId: opts.provider };
        if (opts.model) body.model = opts.model;
        if (opts.agentBinding) body.agentBindingId = opts.agentBinding;
        if (opts.timeout) body.timeout = Number(opts.timeout);
        const result = (await ctx.client.post(
          `/ai/tasks/${opts.task}/dispatch-cli`,
          body,
        )) as DispatchResult;
        out(ctx, result);
        if (opts.watch && result.executionRunId) {
          await pollStatus(ctx, result.executionRunId, Number(opts.watchTimeout));
        }
      },
    );
}
