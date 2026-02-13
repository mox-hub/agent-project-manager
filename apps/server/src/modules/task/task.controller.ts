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
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { CreateTaskDependencyDto } from './dto/create-task-dependency.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: any) {
    return this.taskService.create(createTaskDto, user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.update(id, updateTaskDto, user.id);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.delete(id, user.id);
  }

  @Post(':id/dependencies')
  addDependency(
    @Param('id') id: string,
    @Body() dto: CreateTaskDependencyDto,
    @CurrentUser() user: any,
  ) {
    return this.taskService.addDependency(id, dto, user.id);
  }

  @Delete(':id/dependencies/:dependencyId')
  removeDependency(
    @Param('id') id: string,
    @Param('dependencyId') dependencyId: string,
    @CurrentUser() user: any,
  ) {
    return this.taskService.removeDependency(id, dependencyId, user.id);
  }

  @Get(':id/activities')
  getActivities(@Param('id') id: string, @CurrentUser() user: any) {
    return this.taskService.getActivities(id, user.id);
  }
}
