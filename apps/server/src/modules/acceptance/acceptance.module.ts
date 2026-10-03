import { Module } from '@nestjs/common';
import { ExecutionModule } from '@/modules/execution/execution.module';
import { DecisionModule } from '@/modules/decision/decision.module';
import { QuickJudgeModule } from '@/modules/ai-hub/quick-judge/quick-judge.module';
import { AcceptanceService } from './acceptance.service';
import { AcceptanceCriteriaService } from './acceptance-criteria.service';
import { CompletenessChecklistService } from './completeness-checklist.service';
import { CompletenessAuditService } from './completeness-audit.service';
import { AcceptanceProbabilityService } from './acceptance-probability.service';
import { GithubEvidenceSubscriber } from './github-evidence.subscriber';
import { AcceptanceController } from './acceptance.controller';

@Module({
  imports: [ExecutionModule, DecisionModule, QuickJudgeModule],
  providers: [
    // PrismaService 由全局 DatabaseModule 提供（工作区 ALS 代理），
    // 此处不可重复声明，否则覆盖为直连默认库的裸实例
    AcceptanceService,
    AcceptanceCriteriaService,
    AcceptanceProbabilityService,
    CompletenessChecklistService,
    CompletenessAuditService,
    GithubEvidenceSubscriber,
  ],
  controllers: [AcceptanceController],
  exports: [
    AcceptanceService,
    AcceptanceCriteriaService,
    AcceptanceProbabilityService,
    CompletenessChecklistService,
    CompletenessAuditService,
  ],
})
export class AcceptanceModule {}
