/**
 * ExecutionWorktreeModule —— G5-b 执行隔离与成果合入（ADR-017）。
 *
 * **刻意零 imports**：ExecutionWorktreeService 的消费方是 decision / execution /
 * cli-dispatch 三个模块。若挂靠 GitModule，其模块链（GitHub → Integration →
 * Linear → IssueModule）与消费方构成 TS 级模块环（decision → git → github →
 * integration → linear → issue → execution → decision），Nest 启动即崩
 * （contract-export 实证）。独立最小模块 = 依赖方向恒定无环。
 */
import { Module } from '@nestjs/common';
import { ExecutionWorktreeService } from './execution-worktree.service';

@Module({
  providers: [ExecutionWorktreeService],
  exports: [ExecutionWorktreeService],
})
export class ExecutionWorktreeModule {}
