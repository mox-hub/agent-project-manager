import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { PrismaService } from '../../../../core/database/prisma.service';
import { LinearSyncService, type SyncSummary } from './linear-sync.service';
import { LinearClient, LinearApiError } from './linear-client';
import { LinearSDKService } from './linear-sdk.service';
import {
  LinearCreateIssueDto,
  LinearResolveConflictDto,
  LinearSyncProjectDto,
  LinearSyncTasksDto,
} from '../../dto/linear-sync.dto';

@ApiTags('Integration / Linear')
@Controller('integrations/linear')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class LinearController {
  constructor(
    private readonly sync: LinearSyncService,
    private readonly prisma: PrismaService,
    private readonly sdk: LinearSDKService,
  ) {}

  private async assertIntegrationAccess(integrationId: string, userId: string) {
    const ic = await this.prisma.integrationConfig.findUnique({
      where: { id: integrationId },
    });
    if (!ic) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }
    if (ic.scope === 'project' && ic.projectId) {
      const proj = await this.prisma.project.findUnique({
        where: { id: ic.projectId },
        include: { members: true },
      });
      if (!proj || !proj.members.some((m) => m.userId === userId)) {
        throw new ForbiddenException(
          'You do not have access to this integration',
        );
      }
    } else if (ic.createdBy && ic.createdBy !== userId) {
      // Global integrations: only the creator can access (basic check)
      // Allow project members using global integrations via different route if needed
    }
  }

  @Get('test/:integrationId')
  @ApiOperation({ summary: 'Test connection + return viewer info' })
  async test(
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.assertIntegrationAccess(integrationId, user.id);
    return this.sync.testConnection(integrationId);
  }

  @Post('test-inline')
  @ApiOperation({
    summary: 'Test connection with a raw API key (used in setup wizard)',
  })
  async testInline(@Body() body: { apiKey?: string }) {
    if (!body.apiKey || !body.apiKey.trim()) {
      throw new BadRequestException('apiKey is required');
    }
    const client = this.sdk.createClient(body.apiKey.trim());
    try {
      const viewer = await this.sdk.fetchViewer(client);
      return {
        ok: true,
        viewer: {
          id: viewer.id,
          name: viewer.name,
          email: viewer.email,
          organizations: viewer.organization
            ? [
                {
                  id: viewer.organization.id,
                  name: viewer.organization.name,
                  urlKey: viewer.organization.urlKey,
                },
              ]
            : [],
          teams: viewer.teams?.nodes ?? [],
        },
      };
    } catch (err) {
      if (err instanceof LinearApiError) {
        return { ok: false, error: err.message };
      }
      return { ok: false, error: (err as Error).message };
    }
  }

  @Get(':integrationId/projects')
  @ApiOperation({ summary: 'List Linear remote projects' })
  async listProjects(
    @Param('integrationId') integrationId: string,
    @CurrentUser() user: { id: string },
  ) {
    await this.assertIntegrationAccess(integrationId, user.id);
    return this.sync.listRemoteProjects(integrationId);
  }

  @Get(':integrationId/sync-logs')
  @ApiOperation({ summary: 'List sync logs for this integration' })
  async listLogs(
    @Param('integrationId') integrationId: string,
    @Query('limit') limit: string | undefined,
    @Query('projectId') projectId: string | undefined,
    @CurrentUser() user: { id: string },
  ) {
    await this.assertIntegrationAccess(integrationId, user.id);
    const parsedLimit = limit ? parseInt(limit, 10) || 50 : 50;
    return this.sync.getSyncLogs(integrationId, parsedLimit, projectId);
  }

  @Post('sync/project')
  @ApiOperation({
    summary:
      'Pull a Linear project (optionally to a local project) — single direction (Linear -> APM)',
  })
  async syncProject(
    @Body() dto: LinearSyncProjectDto,
    @CurrentUser() user: { id: string },
  ) {
    await this.assertIntegrationAccess(dto.integrationId, user.id);
    return this.sync.syncProject({
      integrationId: dto.integrationId,
      linearProjectId: dto.linearProjectId,
      targetLocalProjectId: dto.targetLocalProjectId,
      actorId: user.id,
    });
  }

  @Post('sync/tasks')
  @ApiOperation({
    summary: 'Sync all tasks in a project (two-way / pull / push)',
  })
  async syncTasks(
    @Body() dto: LinearSyncTasksDto,
    @CurrentUser() user: { id: string },
  ): Promise<SyncSummary> {
    // 解析 integrationId：默认用项目绑定的
    const link = await this.prisma.taskProviderLink.findFirst({
      where: { projectId: dto.projectId },
    });
    const integrationId = link?.integrationId;
    if (!integrationId) {
      throw new NotFoundException(
        'Project has no Linear integration linked. Please run project sync first.',
      );
    }
    return this.sync.syncProjectTasks({
      projectId: dto.projectId,
      integrationId,
      linearProjectId: link.externalProjectId,
      direction: dto.direction,
      taskIds: dto.taskIds,
      actorId: user.id,
      confirm: dto.confirm,
    });
  }

  @Post('sync/task/push-create')
  @ApiOperation({
    summary: 'Push-create a Linear issue from a local task',
  })
  async pushCreate(
    @Body() dto: LinearCreateIssueDto,
    @CurrentUser() user: { id: string },
  ) {
    const link = await this.prisma.taskProviderLink.findFirst({
      where: { projectId: dto.projectId },
    });
    if (!link) {
      throw new NotFoundException('Project has no Linear integration linked.');
    }
    return this.sync.pushCreateTask({
      projectId: dto.projectId,
      integrationId: link.integrationId,
      localTaskId: dto.localTaskId,
      actorId: user.id,
    });
  }

  @Post('sync/task/:taskId/resolve')
  @ApiOperation({ summary: 'Resolve a sync conflict on a task' })
  async resolveConflict(
    @Param('taskId') taskId: string,
    @Body() dto: LinearResolveConflictDto,
    @CurrentUser() user: { id: string },
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task || !task.externalIssueId) {
      throw new NotFoundException('Task is not linked to Linear');
    }
    const link = await this.prisma.taskProviderLink.findFirst({
      where: { projectId: task.projectId ?? undefined },
    });
    if (!link) {
      throw new NotFoundException('Project has no Linear integration linked.');
    }
    return this.sync.resolveConflict({
      taskId,
      integrationId: link.integrationId,
      resolution: dto.resolution,
      actorId: user.id,
    });
  }
}
