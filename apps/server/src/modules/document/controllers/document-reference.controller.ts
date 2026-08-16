// Document Reference Controller
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentReferenceService } from '../services/document-reference.service';

@ApiTags('Document References')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/references')
export class DocumentReferenceController {
  constructor(private readonly referenceService: DocumentReferenceService) {}

  @Get()
  @ApiOperation({ summary: '获取文档的所有引用' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '返回引用列表' })
  async getReferences(@Param('documentId') documentId: string) {
    return this.referenceService.getReferencesByDocument(documentId);
  }

  @Post()
  @ApiOperation({ summary: '创建引用' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 201, description: '引用已创建' })
  async createReference(
    @Param('documentId') documentId: string,
    @Body() dto: any,
    @Query('createdBy') createdBy: string,
  ) {
    return this.referenceService.createReference({
      ...dto,
      documentId,
      createdBy,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: '获取引用统计' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '返回统计' })
  async getReferenceStats(@Param('documentId') documentId: string) {
    return this.referenceService.getReferenceStats(documentId);
  }

  @Delete(':referenceId')
  @ApiOperation({ summary: '删除引用' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiParam({ name: 'referenceId', description: '引用 ID' })
  @ApiResponse({ status: 200, description: '已删除' })
  async deleteReference(@Param('referenceId') referenceId: string) {
    await this.referenceService.deleteReference(referenceId);
  }
}

// 独立的引用控制器（用于来源侧查询）
@ApiTags('Document References (Source)')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('references')
export class SourceReferenceController {
  constructor(private readonly referenceService: DocumentReferenceService) {}

  @Get('source/:sourceType/:sourceId')
  @ApiOperation({ summary: '根据来源获取引用' })
  @ApiParam({ name: 'sourceType', description: '来源类型' })
  @ApiParam({ name: 'sourceId', description: '来源 ID' })
  @ApiResponse({ status: 200, description: '返回引用列表' })
  async getReferencesBySource(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.referenceService.getReferencesBySource(sourceType, sourceId);
  }

  @Delete('source/:sourceType/:sourceId')
  @ApiOperation({ summary: '删除来源的所有引用' })
  @ApiParam({ name: 'sourceType', description: '来源类型' })
  @ApiParam({ name: 'sourceId', description: '来源 ID' })
  @ApiResponse({ status: 200, description: '已删除' })
  async deleteReferencesBySource(
    @Param('sourceType') sourceType: string,
    @Param('sourceId') sourceId: string,
  ) {
    await this.referenceService.deleteReferencesBySource(sourceType, sourceId);
  }

  @Get('section/:sectionId')
  @ApiOperation({ summary: '根据章节获取引用' })
  @ApiParam({ name: 'sectionId', description: '章节 ID' })
  @ApiResponse({ status: 200, description: '返回引用列表' })
  async getReferencesBySection(@Param('sectionId') sectionId: string) {
    return this.referenceService.getReferencesBySection(sectionId);
  }

  @Get('parse')
  @ApiOperation({ summary: '解析引用字符串' })
  @ApiQuery({ name: 'reference', required: true })
  @ApiResponse({ status: 200, description: '返回解析结果' })
  async parseReference(@Query('reference') reference: string) {
    return this.referenceService.parseReferenceString(reference);
  }

  @Get('generate')
  @ApiOperation({ summary: '生成引用字符串' })
  @ApiQuery({ name: 'documentId', required: true })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'anchor', required: false })
  @ApiResponse({ status: 200, description: '返回生成结果' })
  async generateReference(
    @Query('documentId') documentId: string,
    @Query('sectionId') sectionId?: string,
    @Query('anchor') anchor?: string,
  ) {
    return {
      reference: this.referenceService.generateReferenceString(
        documentId,
        sectionId,
        anchor,
      ),
    };
  }
}
