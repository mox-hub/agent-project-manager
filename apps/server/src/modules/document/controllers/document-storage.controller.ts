import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import {
  DocumentStorageService,
  type StorageConfig,
  type StoredFileMeta,
} from '../services/document-storage.service';
import { AsyncFileSyncService, type SyncWarning } from '../services/async-file-sync.service';

@ApiTags('Document Storage')
@ApiBearerAuth('JWT-auth')
@Controller('documents/storage')
@UseGuards(JwtAuthGuard)
export class DocumentStorageController {
  constructor(
    private readonly storage: DocumentStorageService,
    private readonly asyncFileSync: AsyncFileSyncService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Get document storage configuration' })
  @ApiResponse({ status: 200, description: '返回存储配置' })
  async getConfig(): Promise<StorageConfig> {
    return this.storage.getConfig();
  }

  @Put('config')
  @ApiOperation({ summary: 'Update document storage configuration' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateConfig(@Body() updates: Partial<StorageConfig>): Promise<StorageConfig> {
    return this.storage.updateConfig(updates);
  }

  @Get('default-path')
  @ApiOperation({ summary: 'Detect default storage path' })
  @ApiResponse({ status: 200, description: '返回默认路径' })
  async getDefaultPath(): Promise<{ path: string }> {
    const p = await this.storage.detectDefaultPath();
    return { path: p };
  }

  @Get('files')
  @ApiOperation({ summary: 'List all storage files' })
  @ApiResponse({ status: 200, description: '返回文件列表' })
  async listFiles(): Promise<StoredFileMeta[]> {
    return this.storage.listMarkdownFiles();
  }
}

@ApiTags('Document Sync')
@ApiBearerAuth('JWT-auth')
@Controller('documents/sync')
@UseGuards(JwtAuthGuard)
export class DocumentSyncController {
  constructor(private readonly asyncFileSync: AsyncFileSyncService) {}

  @Get('warnings')
  @ApiOperation({ summary: 'List documents whose local-file sync is failing' })
  @ApiResponse({ status: 200, description: '返回同步警告列表' })
  async listWarnings(): Promise<SyncWarning[]> {
    return this.asyncFileSync.getWarnings();
  }

  @Post('warnings/:id/clear')
  @ApiOperation({ summary: 'Acknowledge / clear a sync warning for a document' })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '已确认' })
  async clearWarning(
    @Param('id') id: string,
  ): Promise<{ cleared: boolean }> {
    const cleared = this.asyncFileSync.clearWarning(id);
    return { cleared };
  }
}

@ApiTags('Document Storage')
@ApiBearerAuth('JWT-auth')
@Controller('documents/:id/storage')
@UseGuards(JwtAuthGuard)
export class DocumentFileController {
  constructor(private readonly storage: DocumentStorageService) {}

  @Get()
  @ApiOperation({ summary: 'Load document markdown from local storage' })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '返回文档内容' })
  async load(@Param('id') id: string): Promise<{ content: string }> {
    const content = await this.storage.loadMarkdown(id);
    return { content };
  }

  @Post()
  @ApiOperation({ summary: 'Save document markdown to local storage' })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({ status: 201, description: '已保存' })
  async save(
    @Param('id') id: string,
    @Body() body: { content: string },
  ): Promise<StoredFileMeta> {
    const meta = await this.storage.saveMarkdown(id, body.content);
    return meta;
  }

  @Post('delete')
  @ApiOperation({ summary: 'Delete document storage file' })
  @ApiParam({ name: 'id', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '已删除' })
  async delete(@Param('id') id: string): Promise<{ deleted: boolean }> {
    const deleted = await this.storage.deleteMarkdown(id);
    return { deleted };
  }
}
