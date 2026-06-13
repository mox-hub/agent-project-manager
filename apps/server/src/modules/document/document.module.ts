import { Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { FolderService } from './folder.service';
import { FolderController } from './folder.controller';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { ImportExportService } from './import-export.service';
import { DocumentEnhanceModule } from './document-enhance.module';

@Module({
  imports: [DocumentEnhanceModule],
  controllers: [
    DocumentController,
    FolderController,
    ApprovalController,
  ],
  providers: [
    DocumentService,
    FolderService,
    ApprovalService,
    ImportExportService,
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
