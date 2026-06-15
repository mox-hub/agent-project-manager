// Document Task Link Controller
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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/decorators/current-user.decorator';
import { DocumentTaskLinkService } from '../services/document-task-link.service';

@ApiTags('Document Task Links')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller()
export class DocumentTaskLinkController {
  constructor(private readonly linkService: DocumentTaskLinkService) {}

  // ========== 文档级关联 ==========

  @Get('documents/:documentId/links')
  @ApiOperation({ summary: '获取文档关联的任务' })
  async getLinksByDocument(@Param('documentId') documentId: string) {
    return this.linkService.getLinksByDocument(documentId);
  }

  @Post('documents/:documentId/links')
  @ApiOperation({ summary: '添加任务关联' })
  async createLink(
    @Param('documentId') documentId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.linkService.createLink({
      ...dto,
      documentId,
      createdBy: user.id,
    });
  }

  @Delete('documents/links/:linkId')
  @ApiOperation({ summary: '删除任务关联' })
  async deleteLink(@Param('linkId') linkId: string) {
    await this.linkService.deleteLink(linkId);
    return { success: true };
  }

  @Put('documents/links/:linkId/type')
  @ApiOperation({ summary: '更新关联类型' })
  async updateLinkType(
    @Param('linkId') linkId: string,
    @Body() dto: { linkType: string },
  ) {
    return this.linkService.updateLinkType(linkId, dto.linkType as any);
  }

  // ========== 章节级关联 ==========

  @Get('documents/sections/:sectionId/links')
  @ApiOperation({ summary: '获取章节关联的任务' })
  async getLinksBySection(@Param('sectionId') sectionId: string) {
    return this.linkService.getLinksBySection(sectionId);
  }

  @Post('documents/sections/:sectionId/links')
  @ApiOperation({ summary: '添加章节任务关联' })
  async createSectionLink(
    @Param('sectionId') sectionId: string,
    @Body() dto: any,
    @CurrentUser() user: any,
  ) {
    return this.linkService.createLink({
      ...dto,
      sectionId,
      createdBy: user.id,
    });
  }

  @Delete('documents/sections/links/:linkId')
  @ApiOperation({ summary: '删除章节任务关联' })
  async deleteSectionLink(@Param('linkId') linkId: string) {
    await this.linkService.deleteLink(linkId);
    return { success: true };
  }

  // ========== 任务侧关联 ==========

  @Get('tasks/:taskId/document-links')
  @ApiOperation({ summary: '获取任务关联的文档' })
  async getLinksByTask(@Param('taskId') taskId: string) {
    return this.linkService.getLinksByTask(taskId);
  }

  // ========== 项目侧关联 ==========

  @Get('projects/:projectId/document-links')
  @ApiOperation({ summary: '获取项目关联的文档' })
  async getLinksByProject(@Param('projectId') projectId: string) {
    return this.linkService.getLinksByProject(projectId);
  }

  // ========== 统计 ==========

  @Get('documents/:documentId/links/stats')
  @ApiOperation({ summary: '获取文档关联统计' })
  async getLinkStats(@Param('documentId') documentId: string) {
    return this.linkService.getLinkStats(documentId);
  }

  @Get('documents/:documentId/links/by-section')
  @ApiOperation({ summary: '按章节聚合文档关联的任务' })
  async getLinksBySectionGrouped(@Param('documentId') documentId: string) {
    return this.linkService.getLinksGroupedBySection(documentId);
  }

  // ========== 批量操作 ==========

  @Post('documents/:documentId/links/batch')
  @ApiOperation({ summary: '批量创建关联' })
  async createLinksBatch(
    @Param('documentId') documentId: string,
    @Body() dto: { links: any[] },
    @CurrentUser() user: any,
  ) {
    const links = dto.links.map((link) => ({
      ...link,
      documentId,
      createdBy: user.id,
    }));
    return this.linkService.createLinksBatch(links);
  }
}
