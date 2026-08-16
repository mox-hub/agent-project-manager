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
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
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
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '返回关联列表' })
  async getLinksByDocument(@Param('documentId') documentId: string) {
    return this.linkService.getLinksByDocument(documentId);
  }

  @Post('documents/:documentId/links')
  @ApiOperation({ summary: '添加任务关联' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 201, description: '关联已创建' })
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
  @ApiParam({ name: 'linkId', description: '关联 ID' })
  @ApiResponse({ status: 200, description: '已删除' })
  async deleteLink(@Param('linkId') linkId: string) {
    await this.linkService.deleteLink(linkId);
  }

  @Put('documents/links/:linkId/type')
  @ApiOperation({ summary: '更新关联类型' })
  @ApiParam({ name: 'linkId', description: '关联 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateLinkType(
    @Param('linkId') linkId: string,
    @Body() dto: { linkType: string },
  ) {
    return this.linkService.updateLinkType(linkId, dto.linkType as any);
  }

  // ========== 章节级关联 ==========

  @Get('documents/sections/:sectionId/links')
  @ApiOperation({ summary: '获取章节关联的任务' })
  @ApiParam({ name: 'sectionId', description: '章节 ID' })
  @ApiResponse({ status: 200, description: '返回关联列表' })
  async getLinksBySection(@Param('sectionId') sectionId: string) {
    return this.linkService.getLinksBySection(sectionId);
  }

  @Post('documents/sections/:sectionId/links')
  @ApiOperation({ summary: '添加章节任务关联' })
  @ApiParam({ name: 'sectionId', description: '章节 ID' })
  @ApiResponse({ status: 201, description: '已创建' })
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
  @ApiParam({ name: 'linkId', description: '关联 ID' })
  @ApiResponse({ status: 200, description: '已删除' })
  async deleteSectionLink(@Param('linkId') linkId: string) {
    await this.linkService.deleteLink(linkId);
  }

  // ========== 任务侧关联 ==========

  @Get('tasks/:taskId/document-links')
  @ApiOperation({ summary: '获取任务关联的文档' })
  @ApiParam({ name: 'taskId', description: '任务 ID' })
  @ApiResponse({ status: 200, description: '返回文档列表' })
  async getLinksByTask(@Param('taskId') taskId: string) {
    return this.linkService.getLinksByTask(taskId);
  }

  // ========== 项目侧关联 ==========

  @Get('projects/:projectId/document-links')
  @ApiOperation({ summary: '获取项目关联的文档' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '返回文档列表' })
  async getLinksByProject(@Param('projectId') projectId: string) {
    return this.linkService.getLinksByProject(projectId);
  }

  // ========== 统计 ==========

  @Get('documents/:documentId/links/stats')
  @ApiOperation({ summary: '获取文档关联统计' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '返回统计' })
  async getLinkStats(@Param('documentId') documentId: string) {
    return this.linkService.getLinkStats(documentId);
  }

  @Get('documents/:documentId/links/by-section')
  @ApiOperation({ summary: '按章节聚合文档关联的任务' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 200, description: '返回聚合结果' })
  async getLinksBySectionGrouped(@Param('documentId') documentId: string) {
    return this.linkService.getLinksGroupedBySection(documentId);
  }

  // ========== 批量操作 ==========

  @Post('documents/:documentId/links/batch')
  @ApiOperation({ summary: '批量创建关联' })
  @ApiParam({ name: 'documentId', description: '文档 ID' })
  @ApiResponse({ status: 201, description: '批量创建成功' })
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
