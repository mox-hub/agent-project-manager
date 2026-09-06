import { Injectable, Logger } from '@nestjs/common';
import { TaskService } from '@/modules/task/task.service';
import { CliDispatchService } from '@/modules/cli-dispatch/dispatch.service';
import type { DispatchResult } from '@/modules/cli-dispatch/dispatch.service';

/**
 * AI Worker Coordinator — Task 指派到 AI 成员（V3 身份口径）的编排桥。
 * 身份即 Member(type=ai_agent)：指派走 IssueAssignee 同步，执行走 CLI 派发；
 * 执行结果由 ExecutionRun 状态机 + 验收门禁回流，不再回写 Task V1 字段。
 */
@Injectable()
export class AiWorkerCoordinatorService {
  private readonly logger = new Logger(AiWorkerCoordinatorService.name);

  constructor(
    private readonly taskService: TaskService,
    private readonly cliDispatch: CliDispatchService,
  ) {}

  /**
   * Assign a task to an AI member:
   * 1. Bind member to task (IssueAssignee + 主负责人三字段同步，含成员/项目校验)
   * 2. Dispatch to CLI via CliDispatchService (creates ExecutionRun)
   */
  async assignTaskToAI(
    taskId: string,
    memberId: string,
    userId: string,
  ): Promise<{
    taskId: string;
    executionRunId: string;
    status: string;
    auditWarning?: string;
  }> {
    // 1. 指派：IssueAssignee 绑定 + assigneeType/aiAgentId 同步（内部校验成员与项目绑定）
    await this.taskService.assignAgent(taskId, { agentId: memberId }, userId);

    // 2. 派发：成员级 provider 解析 + ExecutionRun 创建
    let dispatchResult: DispatchResult;
    try {
      dispatchResult = await this.cliDispatch.dispatchTaskToCli(
        taskId,
        userId,
        {
          memberId,
        },
      );
    } catch (err) {
      this.logger.error(
        `CLI dispatch failed for task ${taskId}: ${(err as Error).message}`,
      );
      throw err;
    }

    this.logger.log(
      `Task ${taskId} dispatched to AI member ${memberId} (execution: ${dispatchResult.executionRunId})`,
    );

    return {
      taskId,
      executionRunId: dispatchResult.executionRunId,
      status: 'dispatched',
      // 两级审计 gate：派发黄牌警告（审计 red，不阻断）
      auditWarning: dispatchResult.auditWarning,
    };
  }
}
