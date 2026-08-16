import {
  Controller,
  Get,
  Post,
  Patch,
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
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { ProjectRoleDefinitionService } from './project-role.service';
import { CreateProjectRoleDto, UpdateProjectRoleDto } from './project-role.dto';

@ApiTags('Project Roles')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/roles')
export class ProjectRoleDefinitionController {
  constructor(private readonly service: ProjectRoleDefinitionService) {}

  @Get()
  @ApiOperation({ summary: '列出项目级 + 全局默认执行角色' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  async list(@Param('projectId') projectId: string) {
    return this.service.list(projectId);
  }

  @Get('templates')
  @ApiOperation({ summary: '仅列出全局默认模板' })
  async templates() {
    return this.service.listGlobal();
  }

  @Post()
  @ApiOperation({ summary: '创建项目级执行角色' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 201, description: '已创建' })
  @ApiResponse({ status: 409, description: 'key 已存在' })
  async create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateProjectRoleDto,
  ) {
    return this.service.create(projectId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新项目级执行角色' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  async update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectRoleDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除项目级执行角色' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'id', description: '角色 ID' })
  async remove(@Param('projectId') projectId: string, @Param('id') id: string) {
    await this.service.remove(id);
    return { success: true };
  }

  @Post('seed-from-global')
  @ApiOperation({ summary: '从全局模板复制为项目级角色（幂等）' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  async seedFromGlobal(@Param('projectId') projectId: string) {
    const created = await this.service.seedProjectRolesFromGlobal(projectId);
    return { created: created.length, roles: created };
  }
}
