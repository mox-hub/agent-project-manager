import { Module } from '@nestjs/common';
import { DecisionService } from './decision.service';
import { DecisionController } from './decision.controller';

/**
 * 决策收件箱（卡片文法）只读聚合层：
 * 跨 ApprovalRequest / Acceptance 的统一待决投影。
 * 决议动作仍走各自原有闭环端点（approval resolve / acceptance review），
 * 本模块不承载写路径，避免第二套状态变更入口。
 */
@Module({
  providers: [
    // PrismaService 由全局 DatabaseModule 提供（工作区 ALS 代理），
    // 此处不可重复声明，否则覆盖为直连默认库的裸实例
    DecisionService,
  ],
  controllers: [DecisionController],
  exports: [DecisionService],
})
export class DecisionModule {}
