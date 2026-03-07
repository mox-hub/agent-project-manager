import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TaskTemplateService } from './task-template.service';
import { CreateTaskTemplateDto, UpdateTaskTemplateDto, UseTaskTemplateDto } from './dto/create-task-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';

@ApiTags('Task Templates')
@Controller('task-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class TaskTemplateController {
  constructor(private readonly taskTemplateService: TaskTemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  create(@Body() dto: CreateTaskTemplateDto, @CurrentUser() user: any) {
    return this.taskTemplateService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all task templates' })
  @ApiQuery({ name: 'projectId', required: false, description: 'Project ID to filter templates' })
  @ApiResponse({ status: 200, description: 'Returns template list' })
  findAll(@Query('projectId') projectId?: string) {
    return this.taskTemplateService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Returns template details' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id') id: string) {
    return this.taskTemplateService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskTemplateDto) {
    return this.taskTemplateService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  delete(@Param('id') id: string) {
    return this.taskTemplateService.delete(id);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Use template to create tasks' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 201, description: 'Tasks created successfully' })
  useTemplate(
    @Param('id') id: string,
    @Body() dto: UseTaskTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.taskTemplateService.useTemplate(id, dto, user.id);
  }
}
