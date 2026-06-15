import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  DocumentStorageService,
  type StorageConfig,
  type StoredFileMeta,
} from '../services/document-storage.service';
import { AsyncFileSyncService, type SyncWarning } from '../services/async-file-sync.service';

@ApiTags('Document Storage')
@Controller('documents/storage')
@UseGuards(JwtAuthGuard)
export class DocumentStorageController {
  constructor(
    private readonly storage: DocumentStorageService,
    private readonly asyncFileSync: AsyncFileSyncService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get document storage configuration' })
  async getConfig(): Promise<StorageConfig> {
    return this.storage.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Update document storage configuration' })
  async updateConfig(@Body() updates: Partial<StorageConfig>): Promise<StorageConfig> {
    return this.storage.updateConfig(updates);
  }

  @Get('default-path')
  @ApiOperation({ summary: 'Detect default storage path' })
  async getDefaultPath(): Promise<{ path: string }> {
    const p = await this.storage.detectDefaultPath();
    return { path: p };
  }

  @Get('files')
  @ApiOperation({ summary: 'List all storage files' })
  async listFiles(): Promise<{ data: StoredFileMeta[] }> {
    const files = await this.storage.listMarkdownFiles();
    return { data: files };
  }
}

@ApiTags('Document Sync')
@Controller('documents/sync')
@UseGuards(JwtAuthGuard)
export class DocumentSyncController {
  constructor(private readonly asyncFileSync: AsyncFileSyncService) {}

  @Get('warnings')
  @ApiOperation({ summary: 'List documents whose local-file sync is failing' })
  async listWarnings(): Promise<{ data: SyncWarning[] }> {
    return { data: this.asyncFileSync.getWarnings() };
  }

  @Post('warnings/:id/clear')
  @ApiOperation({ summary: 'Acknowledge / clear a sync warning for a document' })
  async clearWarning(
    @Param('id') id: string,
  ): Promise<{ data: { cleared: boolean } }> {
    const cleared = this.asyncFileSync.clearWarning(id);
    return { data: { cleared } };
  }
}

@ApiTags('Document Storage')
@Controller('documents/:id/storage')
@UseGuards(JwtAuthGuard)
export class DocumentFileController {
  constructor(private readonly storage: DocumentStorageService) {}

  @Get()
  @ApiOperation({ summary: 'Load document markdown from local storage' })
  async load(@Param('id') id: string): Promise<{ data: { content: string } }> {
    const content = await this.storage.loadMarkdown(id);
    return { data: { content } };
  }

  @Post()
  @ApiOperation({ summary: 'Save document markdown to local storage' })
  async save(
    @Param('id') id: string,
    @Body() body: { content: string },
  ): Promise<{ data: StoredFileMeta }> {
    const meta = await this.storage.saveMarkdown(id, body.content);
    return { data: meta };
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete document storage file' })
  async delete(@Param('id') id: string): Promise<{ data: { deleted: boolean } }> {
    const deleted = await this.storage.deleteMarkdown(id);
    return { data: { deleted } };
  }
}
