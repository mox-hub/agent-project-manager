// Document Enhance Module - 文档增强模块入口
import { Module } from '@nestjs/common';
import { DocumentSectionService } from './services/document-section.service';
import { DocumentTaskLinkService } from './services/document-task-link.service';
import { DocumentVersionService } from './services/document-version.service';
import { DocumentReferenceService } from './services/document-reference.service';
import { MarkdownParserService } from './services/markdown-parser.service';
import { MdxToolService } from './services/mdx-tool.service';
import { DocumentStorageService } from './services/document-storage.service';
import { AsyncFileSyncService } from './services/async-file-sync.service';
import { DocumentTagService } from './services/document-tag.service';
import { DocsGitService } from './services/docs-git.service';

import { DocumentSectionController } from './controllers/document-section.controller';
import { DocumentTaskLinkController } from './controllers/document-task-link.controller';
import { DocumentVersionController } from './controllers/document-version.controller';
import {
  DocumentReferenceController,
  SourceReferenceController,
} from './controllers/document-reference.controller';
import { MdxToolController } from './controllers/mdx-tool.controller';
import {
  DocumentStorageController,
  DocumentFileController,
  DocumentSyncController,
} from './controllers/document-storage.controller';
import {
  DocumentTagController,
  DocumentTagLinkController,
} from './controllers/document-tag.controller';

@Module({
  controllers: [
    DocumentSectionController,
    DocumentTaskLinkController,
    DocumentVersionController,
    DocumentReferenceController,
    SourceReferenceController,
    MdxToolController,
    DocumentStorageController,
    DocumentFileController,
    DocumentSyncController,
    DocumentTagController,
    DocumentTagLinkController,
  ],
  providers: [
    DocumentSectionService,
    DocumentTaskLinkService,
    DocumentVersionService,
    DocumentReferenceService,
    MarkdownParserService,
    MdxToolService,
    DocumentStorageService,
    AsyncFileSyncService,
    DocumentTagService,
    DocsGitService,
  ],
  exports: [
    DocumentSectionService,
    DocumentTaskLinkService,
    DocumentVersionService,
    DocumentReferenceService,
    MarkdownParserService,
    MdxToolService,
    DocumentStorageService,
    AsyncFileSyncService,
    DocumentTagService,
    DocsGitService,
  ],
})
export class DocumentEnhanceModule {}
