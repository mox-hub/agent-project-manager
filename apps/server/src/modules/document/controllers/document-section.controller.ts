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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentSectionService } from '../services/document-section.service';
import { MarkdownParserService } from '../services/markdown-parser.service';

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
  async getSections(@Param('documentId') documentId: string) {
    return this.sectionService.getSectionsByDocument(documentId);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取章节嵌套结构' })
  async getSectionsTree(@Param('documentId') documentId: string) {
    return this.sectionService.getSectionsTree(documentId);
  }

  @Get(':sectionId')
  @ApiOperation({ summary: '获取单个章节' })
  async getSection(@Param('sectionId') sectionId: string) {
    return this.sectionService.getSection(sectionId);
  }

  @Get('anchor/:anchor')
  @ApiOperation({ summary: '根据锚点获取章节' })
  async getSectionByAnchor(
    @Param('documentId') documentId: string,
    @Param('anchor') anchor: string,
  ) {
    return this.sectionService.getSectionByAnchor(documentId, anchor);
  }

  @Post()
  @ApiOperation({ summary: '创建章节' })
  async createSection(
    @Param('documentId') documentId: string,
    @Body() dto: any,
  ) {
    return this.sectionService.createSection({ ...dto, documentId });
  }

  @Put(':sectionId')
  @ApiOperation({ summary: '更新章节' })
  async updateSection(@Param('sectionId') sectionId: string, @Body() dto: any) {
    return this.sectionService.updateSection(sectionId, dto);
  }

  @Delete(':sectionId')
  @ApiOperation({ summary: '删除章节' })
  async deleteSection(@Param('sectionId') sectionId: string) {
    await this.sectionService.deleteSection(sectionId);
    return { success: true };
  }

  @Post('refresh')
  @ApiOperation({ summary: '从 Markdown 内容刷新章节索引' })
  async refreshSections(
    @Param('documentId') documentId: string,
    @Body() dto: { content: string },
  ) {
    const parsed = this.markdownParser.parseMarkdown(dto.content);
    const sections = this.markdownParser.extractSections(documentId, parsed);
    return this.sectionService.refreshSections(documentId, sections);
  }
}
