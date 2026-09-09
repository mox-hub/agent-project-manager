import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../core/database/prisma.service';
import {
  ContractBindingService,
  ContractFileType,
} from './contract-binding.service';

/**
 * execution 终态 → 托管区对齐检查（v2 纪要 §6.4：git 事件节拍的 V1 着落点）。
 * agent 执行收口必然经过 execution，对齐检查挂在此处；失败仅告警不阻断执行链。
 */
@Injectable()
export class ContractExecutionSubscriber {
  private readonly logger = new Logger(ContractExecutionSubscriber.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bindings: ContractBindingService,
  ) {}

  @OnEvent('runtime.execution.result')
  async onExecutionResult(payload: {
    executionRunId?: string;
    status?: string;
  }): Promise<void> {
    if (!payload?.executionRunId || payload.status !== 'completed') return;
    try {
      const execution = await this.prisma.execution.findUnique({
        where: { id: payload.executionRunId },
        select: { projectId: true },
      });
      if (!execution?.projectId) return;

      const managedBindings = await this.prisma.contractFileBinding.findMany({
        where: { projectId: execution.projectId, syncMode: 'managed' },
        select: { fileType: true },
      });
      for (const { fileType } of managedBindings) {
        const report = await this.bindings.checkAlignment(
          execution.projectId,
          fileType as ContractFileType,
        );
        if (report.state === 'conflicted') {
          this.logger.warn(
            `执行收口对齐检出冲突: project=${execution.projectId} file=${fileType}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        `执行收口对齐检查跳过: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
