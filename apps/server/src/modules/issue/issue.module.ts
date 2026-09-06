import { Module } from '@nestjs/common';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { IssueIdService } from './services/issue-id.service';
import { IssueIdManagementService } from './services/issue-id-management.service';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [ExecutionModule],
  controllers: [IssueController],
  providers: [IssueService, IssueIdService, IssueIdManagementService],
  exports: [IssueService, IssueIdService, IssueIdManagementService],
})
export class IssueModule {}
