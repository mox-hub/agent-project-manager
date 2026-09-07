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
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { IssueTemplateService } from './issue-template.service';
import {
  CreateIssueTemplateDto,
  IssueTemplateResponseDto,
  UpdateIssueTemplateDto,
  UseIssueTemplateDto,
  UseIssueTemplateResponseDto,
} from './dto/create-issue-template.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Task Templates')
@Controller('issue-templates')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IssueTemplateController {
  constructor(private readonly issueTemplateService: IssueTemplateService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task template' })
  @ApiCreatedResponse({
    type: IssueTemplateResponseDto,
    description: 'Template created successfully',
  })
  create(@Body() dto: CreateIssueTemplateDto, @CurrentUser() user: any) {
    return this.issueTemplateService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all task templates' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Project ID to filter templates',
  })
  @ApiOkResponse({
    type: IssueTemplateResponseDto,
    isArray: true,
    description: 'Returns template list',
  })
  findAll(@Query('projectId') projectId?: string) {
    return this.issueTemplateService.findAll(projectId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiOkResponse({
    type: IssueTemplateResponseDto,
    description: 'Returns template details',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOne(@Param('id') id: string) {
    return this.issueTemplateService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiOkResponse({
    type: IssueTemplateResponseDto,
    description: 'Template updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Template not found' })
  update(@Param('id') id: string, @Body() dto: UpdateIssueTemplateDto) {
    return this.issueTemplateService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template deleted successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  delete(@Param('id') id: string) {
    return this.issueTemplateService.delete(id);
  }

  @Post(':id/use')
  @ApiOperation({ summary: 'Use template to create tasks' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiCreatedResponse({
    type: UseIssueTemplateResponseDto,
    description: 'Tasks created successfully',
  })
  useTemplate(
    @Param('id') id: string,
    @Body() dto: UseIssueTemplateDto,
    @CurrentUser() user: any,
  ) {
    return this.issueTemplateService.useTemplate(id, dto, user.id);
  }
}
