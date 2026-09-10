import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import {
  DocumentResponseDto,
  DocumentPageResponseDto,
  DocumentStatsResponseDto,
  DocumentDetailResponseDto,
} from './dto/document-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: DocumentResponseDto,
    description: '返回创建后的文档（含 folder/project 摘要）',
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.create(createDocumentDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with pagination' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentPageResponseDto,
    description:
      '文档分页列表（{ data, meta: { page, pageSize, total, totalPages } }）',
  })
  findAll(@Query() query: DocumentQueryDto) {
    return this.documentService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentStatsResponseDto,
    description: '文档统计（{ total, byStatus, byCategory, recent }）',
  })
  getStats(@Query('projectId') projectId?: string) {
    return this.documentService.getStats(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentDetailResponseDto,
    description: '文档详情（含 folder/project/sections/_count）',
  })
  @ApiResponse({ status: 404, description: '文档不存在' })
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentResponseDto,
    description: '返回更新后的文档（含 folder/project 摘要）',
  })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.update(id, updateDocumentDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a document (soft delete)' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('id') id: string) {
    return this.documentService.remove(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore a deleted document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: DocumentResponseDto, description: '返回恢复后的文档' })
  restore(@Param('id') id: string) {
    return this.documentService.restore(id);
  }
}
