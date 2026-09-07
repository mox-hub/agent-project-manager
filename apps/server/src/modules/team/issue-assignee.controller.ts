import {
  Controller,
  Get,
  Post,
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
import { IssueAssigneeService } from './issue-assignee.service';
import {
  CreateIssueAssigneeDto,
  BulkSetIssueAssigneesDto,
  AddIssueWatcherDto,
} from './dto/issue-assignee.dto';
import { MemberLoadResponseDto } from './dto/member-response.dto';
import {
  IssueAssigneeResponseDto,
  IssueAssigneeWithMemberDto,
  IssueAssigneeWithTaskDto,
  IssueWatcherResponseDto,
  IssueWatcherWithMemberDto,
} from './dto/issue-assignee-response.dto';

@ApiTags('Task Assignees')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('issue-assignees')
export class IssueAssigneeController {
  constructor(private readonly service: IssueAssigneeService) {}

  @Get('issue/:issueId')
  @ApiOperation({ summary: '任务的指派/审阅/watcher 列表' })
  @ApiParam({ name: 'issueId', description: '任务 ID' })
  @ApiOkResponse({
    type: IssueAssigneeWithMemberDto,
    isArray: true,
    description: '返回列表（含成员摘要）',
  })
  async list(@Param('issueId') issueId: string) {
    return this.service.list(issueId);
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: '某 Member 负责的任务' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiOkResponse({
    type: IssueAssigneeWithTaskDto,
    isArray: true,
    description: '返回任务列表（含任务/项目摘要）',
  })
  async listByMember(@Param('memberId') memberId: string) {
    return this.service.listByMember(memberId);
  }

  @Get('member/:memberId/load')
  @ApiOperation({ summary: '某 Member 任务负载统计' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiOkResponse({
    type: MemberLoadResponseDto,
    description: '返回负载统计',
  })
  async load(
    @Param('memberId') memberId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.getMemberLoad(memberId, projectId);
  }

  @Post()
  @ApiOperation({ summary: '新增一个指派/协作者/审阅人' })
  @ApiResponse({ status: 201, description: '已添加' })
  @ApiCreatedResponse({ type: IssueAssigneeResponseDto })
  async add(
    @Body() dto: CreateIssueAssigneeDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.add(dto, req.user.id);
  }

  @Post('bulk')
  @ApiOperation({ summary: '批量设置任务的指派/协作者' })
  @ApiResponse({ status: 201, description: '已批量设置' })
  @ApiCreatedResponse({ type: IssueAssigneeResponseDto, isArray: true })
  async bulk(
    @Body() dto: BulkSetIssueAssigneesDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.bulkSet(dto, req.user.id);
  }

  @Delete('issue/:issueId/member/:memberId/role/:role')
  @ApiOperation({ summary: '移除指派/协作者/审阅人' })
  @ApiParam({ name: 'issueId', description: '任务 ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiParam({ name: 'role', description: '角色' })
  @ApiResponse({ status: 200, description: '已移除' })
  async remove(
    @Param('issueId') issueId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.remove(issueId, memberId);
  }

  // ============ Watcher ============

  @Get('issue/:issueId/watchers')
  @ApiOperation({ summary: '任务 watcher 列表' })
  @ApiParam({ name: 'issueId', description: '任务 ID' })
  @ApiOkResponse({
    type: IssueWatcherWithMemberDto,
    isArray: true,
    description: '返回 watcher 列表（含成员摘要）',
  })
  async listWatchers(@Param('issueId') issueId: string) {
    return this.service.listWatchers(issueId);
  }

  @Post('watchers')
  @ApiOperation({ summary: '添加任务 watcher' })
  @ApiResponse({ status: 201, description: '已添加' })
  @ApiCreatedResponse({ type: IssueWatcherResponseDto })
  async addWatcher(@Body() dto: AddIssueWatcherDto) {
    return this.service.addWatcher(dto);
  }

  @Delete('issue/:issueId/watchers/:memberId')
  @ApiOperation({ summary: '移除任务 watcher' })
  @ApiParam({ name: 'issueId', description: '任务 ID' })
  @ApiParam({ name: 'memberId', description: 'Member ID' })
  @ApiResponse({ status: 200, description: '已移除' })
  async removeWatcher(
    @Param('issueId') issueId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeWatcher(issueId, memberId);
  }
}
