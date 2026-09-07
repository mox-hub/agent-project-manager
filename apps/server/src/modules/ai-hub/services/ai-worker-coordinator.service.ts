import { Injectable, Logger } from '@nestjs/common';
import { IssueService } from '@/modules/issue/issue.service';
import { CliDispatchService } from '@/modules/cli-dispatch/dispatch.service';

/**
 * AI Worker Coordinator — Task 指派到 AI 成员（V3 身份口径）的编排桥。
 * 身份即 Member(type=ai_agent)：指派走 IssueAssignee 同步，执行走 CLI 派发；
 * 执行结果由 ExecutionRun 状态机 + 验收门禁回流，不再回写 Task V1 字段。
 */
@Injectable()
export class AiWorkerCoordinatorService {
  private readonly logger = new Logger(AiWorkerCoordinatorService.name);

  constructor(
    private readonly issueService: IssueService,
    private readonly cliDispatch: CliDispatchService,
  ) {}

  /**
   * Assign a task to an AI member:
   * 1. Bind member to task (IssueAssignee + 主负责人三字段同步，含成员/项目校验)
   * 2. Dispatch to CLI via CliDispatchService (creates ExecutionRun)
   *
   * 派发失败不回滚指派（与 POST /issue-assignees 的自动派发同口径）：
   * 如收件箱任务无项目工作区，降级返回 dispatchError 由前端警示。
   */
  async assignTaskToAI(
    issueId: string,
    memberId: string,
    userId: string,
    options: { executionId?: string } = {},
  ): Promise<{
    issueId: string;
    executionRunId?: string;
    status: string;
    auditWarning?: string;
    dispatchError?: string;
  }> {
    // 1. 指派：IssueAssignee 绑定 + assigneeType/aiAgentId 同步（内部校验成员与项目绑定）
    await this.issueService.assignAgent(issueId, { agentId: memberId }, userId);

    // 2. 派发：成员级 provider 解析 + Execution 创建/绑定（4d-3 executionId）
    try {
      const dispatchResult = await this.cliDispatch.dispatchTaskToCli(
        issueId,
        userId,
        {
          memberId,
          executionId: options.executionId,
        },
      );

      this.logger.log(
        `Task ${issueId} dispatched to AI member ${memberId} (execution: ${dispatchResult.executionRunId})`,
      );

      return {
        issueId,
        executionRunId: dispatchResult.executionRunId,
        status: 'dispatched',
        // 两级审计 gate：派发黄牌警告（审计 red，不阻断）
        auditWarning: dispatchResult.auditWarning,
      };
    } catch (err) {
      this.logger.warn(
        `Task ${issueId} assigned to AI member ${memberId}, but dispatch failed: ${(err as Error).message}`,
      );
      return {
        issueId,
        status: 'assigned',
        dispatchError: (err as Error).message,
      };
    }
  }
}
