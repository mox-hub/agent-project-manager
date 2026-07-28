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
} from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new document' })
  @ApiResponse({ status: 201, description: '文档已创建' })
  @ApiResponse({ status: 400, description: '参数错误' })
  create(
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.documentService.create(createDocumentDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents with pagination' })
  @ApiResponse({ status: 200, description: '返回文档列表' })
  findAll(@Query() query: DocumentQueryDto) {
    return this.documentService.findAll(query);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  @ApiResponse({ status: 200, description: '返回文档统计' })
  getStats(@Query('projectId') projectId?: string) {
    return this.documentService.getStats(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a document by ID' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: '返回文档详情' })
  @ApiResponse({ status: 404, description: '文档不存在' })
  findOne(@Param('id') id: string) {
    return this.documentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a document' })
  @ApiParam({ name: 'id', description: 'Document ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentService.update(id, updateDocumentDto);
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
  @ApiResponse({ status: 200, description: '恢复成功' })
  restore(@Param('id') id: string) {
    return this.documentService.restore(id);
  }
}
