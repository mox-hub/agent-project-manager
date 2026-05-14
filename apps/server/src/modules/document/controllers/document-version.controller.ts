// Document Version Controller
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentVersionService } from '../services/document-version.service';

@ApiTags('Document Versions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/versions')
export class DocumentVersionController {
  constructor(private readonly versionService: DocumentVersionService) {}

  @Get()
  @ApiOperation({ summary: '获取版本历史' })
  async getVersions(@Param('documentId') documentId: string) {
    return this.versionService.getVersionsByDocument(documentId);
  }

  @Get('latest')
  @ApiOperation({ summary: '获取最新版本' })
  async getLatestVersion(@Param('documentId') documentId: string) {
    return this.versionService.getLatestVersion(documentId);
  }

  @Get(':versionId')
  @ApiOperation({ summary: '获取特定版本' })
  async getVersion(@Param('versionId') versionId: string) {
    return this.versionService.getVersion(versionId);
  }

  @Post()
  @ApiOperation({ summary: '创建新版本' })
  async createVersion(
    @Param('documentId') documentId: string,
    @Body() dto: { content: string; summary?: string },
    @Query('createdBy') createdBy: string,
  ) {
    return this.versionService.createVersion(
      documentId,
      dto.content,
      createdBy,
      dto.summary,
    );
  }

  @Post('rollback')
  @ApiOperation({ summary: '回滚到指定版本' })
  async rollback(
    @Param('documentId') documentId: string,
    @Body('versionId') versionId: string,
    @Query('createdBy') createdBy: string,
  ) {
    return this.versionService.rollbackToVersion(versionId, createdBy);
  }

  @Get('stats')
  @ApiOperation({ summary: '获取版本统计' })
  async getVersionStats(@Param('documentId') documentId: string) {
    return this.versionService.getVersionStats(documentId);
  }
}
