import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { ImportExportService } from './import-export.service';
import { DocumentEnhanceModule } from './document-enhance.module';
import { DocumentMemberController } from './document-member.controller';
import { DocumentMemberService } from './document-member.service';
import { DocumentContextService } from './services/document-context.service';
import { DecisionModule } from '../decision/decision.module';
import { RevisionImpactService } from './services/revision-impact.service';
import { RevisionImpactSubscriber } from './services/revision-impact.subscriber';
import { RevisionImpactController } from './controllers/revision-impact.controller';

@Module({
  imports: [DocumentEnhanceModule, DecisionModule],
  controllers: [
    DocumentController,
    FolderController,
    ApprovalController,
    DocumentMemberController,
    RevisionImpactController,
  ],
  providers: [
    DocumentService,
    FolderService,
    ApprovalService,
    ImportExportService,
    DocumentMemberService,
    DocumentContextService,
    RevisionImpactService,
    RevisionImpactSubscriber,
  ],
  exports: [
    DocumentService,
    FolderService,
    ApprovalService,
    ImportExportService,
    DocumentEnhanceModule,
    DocumentContextService, // 导出用于AI Hub ContextPack集成
  ],
})
export class DocumentModule {}
