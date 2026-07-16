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
  ],
  exports: [
    DocumentService,
    FolderService,
    ApprovalService,
    ImportExportService,
    DocumentEnhanceModule,
  ],
})
export class DocumentModule {}
