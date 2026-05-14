// Document Enhance Module - 文档增强模块入口
import { Module } from '@nestjs/common';
import { DocumentSectionService } from './services/document-section.service';
import { DocumentTaskLinkService } from './services/document-task-link.service';
import { DocumentVersionService } from './services/document-version.service';
import { DocumentReferenceService } from './services/document-reference.service';
import { MarkdownParserService } from './services/markdown-parser.service';

import { DocumentSectionController } from './controllers/document-section.controller';
import { DocumentTaskLinkController } from './controllers/document-task-link.controller';
import { DocumentVersionController } from './controllers/document-version.controller';
import { SourceReferenceController } from './controllers/document-reference.controller';

@Module({
  controllers: [
    DocumentSectionController,
    DocumentTaskLinkController,
    DocumentVersionController,
    SourceReferenceController,
  ],
  providers: [
    DocumentSectionService,
    DocumentTaskLinkService,
    DocumentVersionService,
    DocumentReferenceService,
    MarkdownParserService,
  ],
  exports: [
    DocumentSectionService,
    DocumentTaskLinkService,
    DocumentVersionService,
    DocumentReferenceService,
    MarkdownParserService,
  ],
})
export class DocumentEnhanceModule {}
