// Document Section Controller
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentSectionService } from '../services/document-section.service';
import { MarkdownParserService } from '../services/markdown-parser.service';
import {
  DocumentSectionResponseDto,
  DocumentSectionTreeNodeDto,
  SectionRefreshResponseDto,
} from '../dto/section-response.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Document Sections')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('documents/:documentId/sections')
export class DocumentSectionController {
  constructor(
    private readonly sectionService: DocumentSectionService,
    private readonly markdownParser: MarkdownParserService,
  ) {}

  @Get()
  @ApiOperation({ summary: '获取文档的所有章节' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentSectionResponseDto,
    isArray: true,
    description: '章节列表（按 order 升序）',
  })
  async getSections(@Param('documentId') documentId: string) {
    return this.sectionService.getSectionsByDocument(documentId);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取章节嵌套结构' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentSectionTreeNodeDto,
    isArray: true,
    description: '章节树（根节点数组，children 按 parentId 嵌套）',
  })
  async getSectionsTree(@Param('documentId') documentId: string) {
    return this.sectionService.getSectionsTree(documentId);
  }

  @Get(':sectionId')
  @ApiOperation({ summary: '获取单个章节' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiParam({ name: 'sectionId', description: '章节 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentSectionResponseDto,
    description: '返回章节详情',
  })
  @ApiResponse({ status: 404, description: '章节不存在' })
  async getSection(@Param('sectionId') sectionId: string) {
    return this.sectionService.getSection(sectionId);
  }

  @Get('anchor/:anchor')
  @ApiOperation({ summary: '根据锚点获取章节' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiParam({ name: 'anchor', description: '锚点标识' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentSectionResponseDto,
    description: '返回章节（未命中锚点时返回 null）',
  })
  async getSectionByAnchor(
    @Param('documentId') documentId: string,
    @Param('anchor') anchor: string,
  ) {
    return this.sectionService.getSectionByAnchor(documentId, anchor);
  }

  @Post()
  @ApiOperation({ summary: '创建章节' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiStandardErrors()
  @ApiCreatedResponse({
    type: DocumentSectionResponseDto,
    description: '返回创建后的章节',
  })
  async createSection(
    @Param('documentId') documentId: string,
    @Body() dto: any,
  ) {
    return this.sectionService.createSection({ ...dto, documentId });
  }

  @Put(':sectionId')
  @ApiOperation({ summary: '更新章节' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiParam({ name: 'sectionId', description: '章节 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: DocumentSectionResponseDto,
    description: '返回更新后的章节',
  })
  async updateSection(@Param('sectionId') sectionId: string, @Body() dto: any) {
    return this.sectionService.updateSection(sectionId, dto);
  }

  @Delete(':sectionId')
  @ApiOperation({ summary: '删除章节' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiParam({ name: 'sectionId', description: '章节 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteSection(@Param('sectionId') sectionId: string) {
    await this.sectionService.deleteSection(sectionId);
  }

  @Post('refresh')
  @ApiOperation({ summary: '从 Markdown 内容刷新章节索引' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: SectionRefreshResponseDto,
    description: '返回重建结果（{ count: 重建的章节数 }）',
  })
  async refreshSections(
    @Param('documentId') documentId: string,
    @Body() dto: { content: string },
  ) {
    const parsed = this.markdownParser.parseMarkdown(dto.content);
    const sections = this.markdownParser.extractSections(documentId, parsed);
    return this.sectionService.refreshSections(documentId, sections);
  }
}
