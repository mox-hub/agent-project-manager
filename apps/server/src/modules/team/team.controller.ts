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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { TeamService } from './team.service';
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
  constructor(private readonly teamService: TeamService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '创建团队' })
  async create(
    @Body() dto: CreateTeamDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.teamService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '列出团队' })
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
  async getDetail(@Param('id') id: string) {
    return this.teamService.getDetail(id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '更新团队' })
  async update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamService.update(id, dto);
  }

  @Post(':id/archive')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '归档团队' })
  async archive(@Param('id') id: string) {
    return this.teamService.archive(id);
  }

  // ============ 团队成员 ============

  @Get(':id/members')
  @ApiOperation({ summary: '团队成员列表' })
  async listMembers(@Param('id') id: string) {
    return this.teamService.listMembers(id);
  }

  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '添加团队成员' })
  async addMember(@Param('id') id: string, @Body() dto: AddTeamMemberDto) {
    return this.teamService.addMember(id, dto);
  }

  @Patch(':id/members/:memberId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '更新团队成员角色' })
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
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.teamService.removeMember(id, memberId);
  }

  // ============ 团队-项目绑定 ============

  @Get(':id/projects')
  @ApiOperation({ summary: '团队已绑定的项目列表' })
  async listProjects(@Param('id') id: string) {
    return this.teamService.listProjects(id);
  }

  @Post(':id/projects')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '团队绑定项目' })
  async bindProject(@Param('id') id: string, @Body() dto: BindTeamProjectDto) {
    return this.teamService.bindProject(id, dto);
  }

  @Delete(':id/projects/:projectId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '团队解绑项目' })
  async unbindProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.teamService.unbindProject(id, projectId);
  }

  // ============ 团队邀请 ============

  @Get(':id/invites')
  @ApiOperation({ summary: '团队邀请列表' })
  async listInvites(@Param('id') id: string) {
    return this.teamService.listInvites(id);
  }

  @Post(':id/invites')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '创建团队邀请' })
  async createInvite(
    @Param('id') id: string,
    @Body() dto: CreateTeamInviteDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.teamService.createInvite(id, dto, req.user.id);
  }

  @Post(':id/invites/:inviteId/revoke')
  @UseGuards(RolesGuard)
  @Roles('admin', 'maintainer')
  @ApiOperation({ summary: '撤销团队邀请' })
  async revokeInvite(
    @Param('id') id: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.teamService.revokeInvite(inviteId);
  }
}
