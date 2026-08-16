import { Module } from '@nestjs/common';
import { PrismaService } from '@/core/database/prisma.service';
import { ExecutionModule } from '@/modules/execution/execution.module';
import { AcceptanceService } from './acceptance.service';
import { AcceptanceCriteriaService } from './acceptance-criteria.service';
import { CompletenessChecklistService } from './completeness-checklist.service';
import { CompletenessAuditService } from './completeness-audit.service';
import { AcceptanceController } from './acceptance.controller';

@Module({
  imports: [ExecutionModule],
  providers: [
    PrismaService,
    AcceptanceService,
    AcceptanceCriteriaService,
    CompletenessChecklistService,
    CompletenessAuditService,
  ],
  controllers: [AcceptanceController],
  exports: [
    AcceptanceService,
    AcceptanceCriteriaService,
    CompletenessChecklistService,
    CompletenessAuditService,
  ],
})
export class AcceptanceModule {}
