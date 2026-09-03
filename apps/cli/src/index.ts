#!/usr/bin/env node
/**
 * apm CLI 入口
 */
import { Command } from 'commander';
import { ApmError } from '@apm/shared';
import { registerAuthCommands } from './commands/auth';
import { registerConfigCommands } from './commands/config';
import { registerWorkspaceCommands } from './commands/workspace';
import { registerApiCommands } from './commands/api';
import { registerMainlineCommands } from './commands/mainline';

async function main() {
  const program = new Command();

  program
    .name('apm')
    .description('Agent Project Manager CLI（瘦客户端直连后端 REST）')
    .version('0.1.0')
    .option('--backend <url>', '后端地址（覆盖配置）')
    .option('--workspace <id>', '工作区 id（注入 x-workspace-id）')
    .option('--json', '以 JSON 输出')
    .option('--profile <name>', '配置档案名（默认 default）');

  registerAuthCommands(program);
  registerConfigCommands(program);
  registerWorkspaceCommands(program);
  registerApiCommands(program);
  registerMainlineCommands(program);

  await program.parseAsync(process.argv);
}

main().catch((err: unknown) => {
  const apmErr =
    err instanceof ApmError
      ? err
      : new ApmError(err instanceof Error ? err.message : String(err));
  console.error(`错误：${apmErr.message}`);
  if (apmErr.backendErrorCode) {
    console.error(`后端错误码：${apmErr.backendErrorCode}`);
  }
  process.exit(apmErr.exitCode);
});
