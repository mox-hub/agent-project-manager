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

@Module({
  imports: [DocumentEnhanceModule],
  controllers: [
    DocumentController,
    FolderController,
    ApprovalController,
    DocumentMemberController,
  ],
  providers: [
    DocumentService,
    FolderService,
    ApprovalService,
    ImportExportService,
    DocumentMemberService,
    DocumentContextService,
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
