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
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
    return this.taskService.create(createTaskDto, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns task details' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.findOne(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.update(id, updateTaskDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.delete(id, user.id);
  }

  @Post(':id/dependencies')
  @ApiOperation({ summary: 'Add task dependency' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 201, description: 'Dependency added successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  addDependency(
    @Param('id') id: string,
    @Body() dto: CreateTaskDependencyDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.addDependency(id, dto, user.id);
  }

  @Delete(':id/dependencies/:dependencyId')
  @ApiOperation({ summary: 'Remove task dependency' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiParam({ name: 'dependencyId', description: 'Dependency ID' })
  @ApiResponse({ status: 200, description: 'Dependency removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeDependency(
    @Param('id') id: string,
    @Param('dependencyId') dependencyId: string,
    @CurrentUser() user: any,
  ) {
    return this.taskService.removeDependency(id, dependencyId, user.id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get task activities' })
  @ApiParam({ name: 'id', description: 'Task ID' })
  @ApiResponse({ status: 200, description: 'Returns task activities' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getActivities(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.getActivities(id, user.id);
  }
}
