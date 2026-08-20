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
import { TeamService } from './team.service';
import { InviteService } from './invite.service';
import {
  CreateTeamDto,
  UpdateTeamDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
  BindTeamProjectDto,
  CreateTeamInviteDto,
} from './dto/team.dto';

@ApiTags('Teams')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('teams')
export class TeamController {
  constructor(
    private readonly teamService: TeamService,
    private readonly inviteService: InviteService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '创建团队' })
  @ApiResponse({ status: 201, description: '团队已创建' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 403, description: '无权限' })
  async create(
    @Body() dto: CreateTeamDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.teamService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '列出团队' })
  @ApiResponse({ status: 200, description: '返回团队列表' })
  async list(
    @Query('status') status?: string,
    @Query('q') q?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.teamService.list({
      status,
      q,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '团队详情' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 200, description: '返回团队详情' })
  @ApiResponse({ status: 404, description: '团队不存在' })
  async getDetail(@Param('id') id: string) {
    return this.teamService.getDetail(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '更新团队' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamService.update(id, dto);
  }

  @Post(':id/archive')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '归档团队' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 200, description: '已归档' })
  async archive(@Param('id') id: string) {
    return this.teamService.archive(id);
  }

  // ============ 团队成员 ============

  @Get(':id/members')
  @ApiOperation({ summary: '团队成员列表' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 200, description: '返回成员列表' })
  async listMembers(@Param('id') id: string) {
    return this.teamService.listMembers(id);
  }

  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '添加团队成员' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 201, description: '成员已添加' })
  async addMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto) {
    return this.teamService.addMember(id, dto);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '更新团队成员角色' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiParam({ name: 'memberId', description: '成员 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberDto,
  ) {
    return this.teamService.updateMember(id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '移除团队成员' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiParam({ name: 'memberId', description: '成员 ID' })
  @ApiResponse({ status: 200, description: '已移除' })
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeMember(id, memberId);
  }

  // ============ 团队-项目绑定 ============

  @Get(':id/projects')
  @ApiOperation({ summary: '团队已绑定的项目列表' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 200, description: '返回项目列表' })
  async listProjects(@Param('id') id: string) {
    return this.teamService.listProjects(id);
  }

  @Post(':id/projects')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '团队绑定项目' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 201, description: '已绑定' })
  async bindProject(@Param('id') id: string, @Body() dto: BindTeamProjectDto) {
    return this.teamService.bindProject(id, dto);
  }

  @Delete(':id/projects/:projectId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '团队解绑项目' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '已解绑' })
  async unbindProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.teamService.unbindProject(id, projectId);
  }

  // ============ 团队邀请 ============

  @Get(':id/invites')
  @ApiOperation({ summary: '团队邀请列表' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 200, description: '返回邀请列表' })
  async listInvites(@Param('id') id: string) {
    return this.teamService.listInvites(id);
  }

  @Post(':id/invites')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '创建团队邀请' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 201, description: '邀请已创建' })
  async createInvite(
    @Param('id') id: string,
    @Body() dto: CreateTeamInviteDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.teamService.createInvite(id, dto, req.user.id);
  }

  @Post(':id/members/direct')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '本地部署直邀：按用户直接加入团队（跳过邮件）' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiResponse({ status: 201, description: '已直接加入' })
  async directAddMember(
    @Param('id') id: string,
    @Body() dto: { userId: string; role?: string },
  ) {
    return this.inviteService.directAdd(id, dto.userId, dto.role ?? 'member');
  }

  @Post(':id/invites/:inviteId/revoke')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '撤销团队邀请' })
  @ApiParam({ name: 'id', description: '团队 ID' })
  @ApiParam({ name: 'inviteId', description: '邀请 ID' })
  @ApiResponse({ status: 200, description: '已撤销' })
  async revokeInvite(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.teamService.revokeInvite(inviteId);
  }
}
