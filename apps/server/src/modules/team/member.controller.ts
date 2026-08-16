import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { MemberService } from './member.service';
import { MemberCardService } from './member-card.service';
import { MemberSearchService } from './member-search.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  MemberQueryDto,
  BindMemberProjectDto,
} from './dto/member.dto';

@ApiTags('Members')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('members')
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly cardService: MemberCardService,
    private readonly searchService: MemberSearchService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '创建 Member（人类/AI）' })
  @ApiResponse({ status: 201, description: 'Member 已创建' })
  @ApiResponse({ status: 403, description: '无权限' })
  async create(
    @Body() dto: CreateMemberDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.memberService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '列出 Member' })
  @ApiResponse({ status: 200, description: '返回 Member 列表' })
  async list(
    @Query('type') type?: string,
    @Query('q') q?: string,
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.memberService.list({
      type,
      q,
      projectId,
      teamId,
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('search')
  @ApiOperation({ summary: '全局成员搜索' })
  @ApiResponse({ status: 200, description: '返回搜索结果' })
  async search(
    @Query('q') q: string,
    @Query('type') type?: string,
    @Query('projectId') projectId?: string,
    @Query('teamId') teamId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search(q, {
      type,
      projectId,
      teamId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: '项目成员列表（含 AI）' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '返回项目成员列表' })
  async listProjectMembers(
    @Param('projectId') projectId: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
  ) {
    const bindings =
      await this.memberService.prisma.memberProjectBinding.findMany({
        where: { projectId },
        select: { memberId: true },
      });
    const memberIds = bindings.map((b) => b.memberId);
    return this.memberService.list({ projectId, type, q, limit: 50 });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Member 详情' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: '返回 Member 详情' })
  @ApiResponse({ status: 404, description: 'Member 不存在' })
  async getDetail(@Param('id') id: string) {
    return this.memberService.findById(id);
  }

  @Get(':id/card')
  @ApiOperation({ summary: 'Member 聚合卡片信息' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: '返回 Member 卡片' })
  async getCard(
    @Param('id') id: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.cardService.getCard(id, projectId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '更新 Member' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.memberService.update(id, dto);
  }

  @Post(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '停用 Member（软删除）' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: '已停用' })
  async deactivate(@Param('id') id: string) {
    return this.memberService.update(id, { status: 'inactive' });
  }

  // ============ Member-Project 绑定 ============

  @Get(':id/projects')
  @ApiOperation({ summary: 'Member 已绑定的项目列表' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 200, description: '返回项目绑定列表' })
  async listProjects(@Param('id') id: string) {
    const bindings =
      await this.memberService.prisma.memberProjectBinding.findMany({
        where: { memberId: id },
      });

    // 手动获取Project信息
    const projectIds = [...new Set(bindings.map((b) => b.projectId))];
    const projects = await this.memberService.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true, name: true, color: true },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    return bindings.map((b) => ({
      ...b,
      project: projectMap.get(b.projectId),
    }));
  }

  @Post(':id/projects')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: 'Member 绑定项目' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiResponse({ status: 201, description: '已绑定' })
  async bindProject(
    @Param('id') id: string,
    @Body() dto: BindMemberProjectDto,
  ) {
    return this.memberService.bindProject(id, dto);
  }

  @Delete(':id/projects/:projectId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: 'Member 解绑项目' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '已解绑' })
  async unbindProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.memberService.unbindProject(id, projectId);
  }
}
