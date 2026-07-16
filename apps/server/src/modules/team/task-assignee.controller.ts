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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { TaskAssigneeService } from './task-assignee.service';
import {
  CreateTaskAssigneeDto,
  BulkSetTaskAssigneesDto,
  AddTaskWatcherDto,
} from './dto/task-assignee.dto';

@ApiTags('Task Assignees')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('task-assignees')
export class TaskAssigneeController {
  constructor(private readonly service: TaskAssigneeService) {}

  @Get('task/:taskId')
  @ApiOperation({ summary: '任务的指派/审阅/watcher 列表' })
  async list(@Param('taskId') taskId: string) {
    return this.service.list(taskId);
  }

  @Get('member/:memberId')
  @ApiOperation({ summary: '某 Member 负责的任务' })
  async listByMember(@Param('memberId') memberId: string) {
    return this.service.listByMember(memberId);
  }

  @Get('member/:memberId/load')
  @ApiOperation({ summary: '某 Member 任务负载统计' })
  async load(
    @Param('memberId') memberId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.service.getMemberLoad(memberId, projectId);
  }

  @Post()
  @ApiOperation({ summary: '新增一个指派/协作者/审阅人' })
  async add(
    @Body() dto: CreateTaskAssigneeDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.add(dto, req.user.id);
  }

  @Post('bulk')
  @ApiOperation({ summary: '批量设置任务的指派/协作者' })
  async bulk(
    @Body() dto: BulkSetTaskAssigneesDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.bulkSet(dto, req.user.id);
  }

  @Delete('task/:taskId/member/:memberId/role/:role')
  @ApiOperation({ summary: '移除指派/协作者/审阅人' })
  async remove(
    @Param('taskId') taskId: string,
    @Param('memberId') memberId: string,
    @Param('role') role: string,
  ) {
    return this.service.remove(taskId, memberId, role);
  }

  // ============ Watcher ============

  @Get('task/:taskId/watchers')
  @ApiOperation({ summary: '任务 watcher 列表' })
  async listWatchers(@Param('taskId') taskId: string) {
    return this.service.listWatchers(taskId);
  }

  @Post('watchers')
  @ApiOperation({ summary: '添加任务 watcher' })
  async addWatcher(@Body() dto: AddTaskWatcherDto) {
    return this.service.addWatcher(dto);
  }

  @Delete('task/:taskId/watchers/:memberId')
  @ApiOperation({ summary: '移除任务 watcher' })
  async removeWatcher(
    @Param('taskId') taskId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.service.removeWatcher(taskId, memberId);
  }
}
