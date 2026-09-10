import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { MemberService } from './member.service';
import { MemberCardService } from './member-card.service';
import { MemberSearchService } from './member-search.service';
import {
  MemberToolGrantService,
  type MemberToolGrantItem,
} from './member-tool-grant.service';
import {
  CreateMemberDto,
  UpdateMemberDto,
  BindMemberProjectDto,
  SetMemberToolGrantsDto,
} from './dto/member.dto';
import {
  MemberCardResponseDto,
  MemberDeleteResponseDto,
  MemberListResponseDto,
  MemberProjectBindingResponseDto,
  MemberProjectListItemDto,
  MemberResponseDto,
  MemberSummaryResponseDto,
  MemberToolGrantResponseDto,
  MemberToolGrantsResponseDto,
} from './dto/member-response.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

@ApiTags('Members')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('members')
export class MemberController {
  constructor(
    private readonly memberService: MemberService,
    private readonly cardService: MemberCardService,
    private readonly searchService: MemberSearchService,
    private readonly toolGrantService: MemberToolGrantService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '创建 Member（人类/AI）' })
  @ApiResponse({ status: 201, description: 'Member 已创建' })
  @ApiStandardErrors()
  @ApiCreatedResponse({ type: MemberResponseDto })
  @ApiResponse({ status: 403, description: '无权限' })
  async create(
    @Body() dto: CreateMemberDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.memberService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '列出 Member' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberListResponseDto,
    description: '返回 Member 列表（data + total）',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberSummaryResponseDto,
    isArray: true,
    description: '返回搜索结果',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberListResponseDto,
    description: '返回项目成员列表（data + total，limit 固定 50）',
  })
  async listProjectMembers(
    @Param('projectId') projectId: string,
    @Query('type') type?: string,
    @Query('q') q?: string,
  ) {
    return this.memberService.list({ projectId, type, q, limit: 50 });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Member 详情' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberResponseDto,
    description: '返回 Member 详情',
  })
  @ApiResponse({ status: 404, description: 'Member 不存在' })
  async getDetail(@Param('id') id: string) {
    return this.memberService.findById(id);
  }

  @Get(':id/card')
  @ApiOperation({ summary: 'Member 聚合卡片信息' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberCardResponseDto,
    description: '返回 Member 聚合卡片',
  })
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
  @ApiStandardErrors()
  @ApiOkResponse({ type: MemberResponseDto, description: '更新成功' })
  async update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.memberService.update(id, dto);
  }

  @Post(':id/deactivate')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '停用 Member（软删除）' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: MemberResponseDto, description: '已停用' })
  async deactivate(@Param('id') id: string) {
    return this.memberService.update(id, { status: 'inactive' });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: '硬删除 Member（清理关联；绑定账号的成员须先停用账号）',
  })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberDeleteResponseDto,
    description: '已删除（返回 { ok: true }）',
  })
  @ApiResponse({ status: 409, description: '成员已绑定登录账号' })
  async remove(@Param('id') id: string) {
    return this.memberService.remove(id);
  }

  // ============ 工具/访问授权（AI 成员） ============

  @Get(':id/tool-grants')
  @ApiOperation({ summary: '成员工具授权列表与可授权目录' })
  @ApiParam({ name: 'id', description: 'Member ID 或 shortId' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberToolGrantsResponseDto,
    description: '返回授权与可授权目录',
  })
  async listToolGrants(@Param('id') id: string) {
    const member = await this.memberService.findById(id);
    return this.toolGrantService.listForMember(member.id);
  }

  @Put(':id/tool-grants')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '批量设置成员工具授权（全量覆盖）' })
  @ApiParam({ name: 'id', description: 'Member ID 或 shortId' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberToolGrantResponseDto,
    isArray: true,
    description: '已更新（返回全量授权列表）',
  })
  async setToolGrants(
    @Param('id') id: string,
    @Body() dto: SetMemberToolGrantsDto,
    @Request() req: { user: { id: string } },
  ) {
    const member = await this.memberService.findById(id);
    const items = dto.items.map((i): MemberToolGrantItem => ({
      scope: i.scope as MemberToolGrantItem['scope'],
      refKey: i.refKey,
      granted: i.granted ?? true,
    }));
    return this.toolGrantService.setGrants(member.id, items, req.user.id);
  }

  // ============ Member-Project 绑定 ============

  @Get(':id/projects')
  @ApiOperation({ summary: 'Member 已绑定的项目列表' })
  @ApiParam({ name: 'id', description: 'Member ID' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberProjectListItemDto,
    isArray: true,
    description: '返回项目绑定列表（含项目摘要）',
  })
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
  @ApiStandardErrors()
  @ApiCreatedResponse({ type: MemberProjectBindingResponseDto })
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
  @ApiStandardErrors()
  @ApiOkResponse({
    type: MemberProjectBindingResponseDto,
    description: '已解绑（返回被删除的绑定）',
  })
  async unbindProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.memberService.unbindProject(id, projectId);
  }
}
