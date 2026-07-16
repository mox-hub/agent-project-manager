import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { DocumentMemberService } from './document-member.service';
import {
  AddDocumentAuthorDto,
  AddDocumentReviewerDto,
  UpdateDocumentReviewerDto,
  AddDocTaskLinkAssigneeDto,
} from './dto/document-member.dto';

@ApiTags('Document Authors & Reviewers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('document-bindings')
export class DocumentMemberController {
  constructor(private readonly service: DocumentMemberService) {}

  // ============ Document Authors ============

  @Get('document/:documentId/authors')
  @ApiOperation({ summary: '文档作者/协作者列表' })
  async listAuthors(@Param('documentId') documentId: string) {
    return this.service.listAuthors(documentId);
  }

  @Post('authors')
  @ApiOperation({ summary: '添加文档作者/协作者' })
  async addAuthor(@Body() dto: AddDocumentAuthorDto) {
    return this.service.addAuthor(dto);
  }

  @Delete('document/:documentId/authors/:memberId/role/:role')
  @ApiOperation({ summary: '移除文档作者' })
  async removeAuthor(
    @Param('documentId') documentId: string,
    @Param('memberId') memberId: string,
    @Param('role') role: string,
  ) {
    return this.service.removeAuthor(documentId, memberId, role);
  }

  // ============ Document Reviewers ============

  @Get('document/:documentId/reviewers')
  @ApiOperation({ summary: '文档审阅人列表' })
  async listReviewers(@Param('documentId') documentId: string) {
    return this.service.listReviewers(documentId);
  }

  @Post('reviewers')
  @ApiOperation({ summary: '添加文档审阅人' })
  async addReviewer(@Body() dto: AddDocumentReviewerDto) {
    return this.service.addReviewer(dto);
  }

  @Patch('reviewers/:id')
  @ApiOperation({ summary: '更新文档审阅人状态' })
  async updateReviewer(
    @Param('id') id: string,
    @Body() dto: UpdateDocumentReviewerDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.updateReviewer(id, dto, req.user.id);
  }

  @Delete('reviewers/:id')
  @ApiOperation({ summary: '移除文档审阅人' })
  async removeReviewer(@Param('id') id: string) {
    return this.service.removeReviewer(id);
  }

  // ============ Document Task Link Assignees ============

  @Get('doc-task-link/:linkId/assignees')
  @ApiOperation({ summary: '文档任务链接负责人列表' })
  async listLinkAssignees(@Param('linkId') linkId: string) {
    return this.service.listLinkAssignees(linkId);
  }

  @Post('doc-task-link/assignees')
  @ApiOperation({ summary: '添加文档任务链接负责人' })
  async addLinkAssignee(@Body() dto: AddDocTaskLinkAssigneeDto) {
    return this.service.addLinkAssignee(dto);
  }

  @Delete('doc-task-link/assignees/:id')
  @ApiOperation({ summary: '移除文档任务链接负责人' })
  async removeLinkAssignee(@Param('id') id: string) {
    return this.service.removeLinkAssignee(id);
  }
}
