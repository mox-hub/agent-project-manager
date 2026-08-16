import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProjectModuleService } from '../services/project-module.service';

@ApiTags('Project Modules')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects/:projectId/modules')
export class ProjectModuleController {
  constructor(private readonly service: ProjectModuleService) {}

  @Get()
  @ApiOperation({ summary: '列出项目的模块代码' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 200, description: '返回模块列表' })
  list(@Param('projectId') projectId: string) {
    return this.service.list(projectId);
  }

  @Post()
  @ApiOperation({ summary: '新增模块代码 (2-4 位大写)' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiResponse({ status: 201, description: '已创建' })
  create(
    @Param('projectId') projectId: string,
    @Body() dto: { code: string; name: string; description?: string },
  ) {
    return this.service.create(projectId, dto);
  }

  @Patch(':moduleId')
  @ApiOperation({ summary: '改模块名称/描述' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'moduleId', description: '模块 ID' })
  @ApiResponse({ status: 200, description: '更新成功' })
  update(
    @Param('projectId') projectId: string,
    @Param('moduleId') moduleId: string,
    @Body() dto: { name?: string; description?: string },
  ) {
    return this.service.update(projectId, moduleId, dto);
  }

  @Delete(':moduleId')
  @ApiOperation({ summary: '删除模块代码 (无任务引用时才允许)' })
  @ApiParam({ name: 'projectId', description: '项目 ID' })
  @ApiParam({ name: 'moduleId', description: '模块 ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(
    @Param('projectId') projectId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.service.remove(projectId, moduleId);
  }
}
