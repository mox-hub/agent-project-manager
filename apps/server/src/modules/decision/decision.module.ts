import { Module } from '@nestjs/common';
import { MessageBusModule } from '@/core/message-bus/message-bus.module';
import { DecisionService } from './decision.service';
import { ProposalService } from './proposal.service';
import { DecisionController } from './decision.controller';
import { ProposalController } from './proposal.controller';

/**
 * 决策收件箱（卡片文法）聚合层：
 * 跨 ApprovalRequest / Acceptance / DecisionProposal 的统一待决投影。
 * 决议动作仍走各自原有闭环端点（approval resolve / acceptance review / proposal resolve），
 * 本模块不承载第二套状态变更语义。
 */
@Module({
  imports: [MessageBusModule],
  providers: [
    // PrismaService 由全局 DatabaseModule 提供（工作区 ALS 代理），
    // 此处不可重复声明，否则覆盖为直连默认库的裸实例
    DecisionService,
    ProposalService,
  ],
  controllers: [DecisionController, ProposalController],
  exports: [DecisionService, ProposalService],
})
export class DecisionModule {}
