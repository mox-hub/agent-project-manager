/**
 * 主线命令聚合：project/task/execution/acceptance/git/team/document/runtime/run
 */
import { Command } from 'commander';
import { registerProjectCommands } from './project';
import { registerTaskCommands } from './task';
import { registerExecutionCommands } from './execution';
import { registerAcceptanceCommands } from './acceptance';
import { registerGitCommands } from './git';
import { registerTeamCommands } from './team';
import { registerDocumentCommands } from './document';
import { registerRuntimeCommands } from './runtime';
import { registerRunCommand } from './run';
import { registerDaemonCommands } from './daemon';
import { registerMcpCommands } from './mcp';

export function registerMainlineCommands(program: Command): void {
  registerProjectCommands(program);
  registerTaskCommands(program);
  registerExecutionCommands(program);
  registerAcceptanceCommands(program);
  registerGitCommands(program);
  registerTeamCommands(program);
  registerDocumentCommands(program);
  registerRuntimeCommands(program);
  registerRunCommand(program);
  registerDaemonCommands(program);
  registerMcpCommands(program);
}
