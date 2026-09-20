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
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IssueTypeService } from './issue-type.service';
import {
  CreateIssueTypeDto,
  IssueTypeResponseDto,
  UpdateIssueTypeDto,
} from './dto/issue-type.dto';
import { ApiStandardErrors } from '@/common/decorators/api-response.decorator';

class ListIssueTypesQueryDto {
  @ApiPropertyOptional({ description: '是否附带任务引用计数' })
  @IsOptional()
  @IsBoolean()
  withUsage?: boolean;
}

@ApiTags('IssueType')
@Controller('issue-types')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class IssueTypeController {
  constructor(private readonly issueTypeService: IssueTypeService) {}

  @Get()
  @ApiOperation({ summary: '工单类型列表（适配引擎元数据源）' })
  @ApiStandardErrors()
  @ApiOkResponse({
    type: IssueTypeResponseDto,
    isArray: true,
    description: '工单类型列表；withUsage=true 时附 _count.issues 引用计数',
  })
  list(@Query() query: ListIssueTypesQueryDto) {
    return this.issueTypeService.list(!!query.withUsage);
  }

  @Post()
  @ApiOperation({ summary: '创建自定义工单类型' })
  @ApiStandardErrors()
  @ApiCreatedResponse({ type: IssueTypeResponseDto, description: '已创建' })
  create(@Body() dto: CreateIssueTypeDto) {
    return this.issueTypeService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改工单类型元数据（名称/图标/颜色/排序）' })
  @ApiStandardErrors()
  @ApiOkResponse({ type: IssueTypeResponseDto, description: '已更新' })
  update(@Param('id') id: string, @Body() dto: UpdateIssueTypeDto) {
    return this.issueTypeService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: '删除工单类型（task 内置类型不可删，被引用时 409）',
  })
  @ApiStandardErrors()
  @ApiOkResponse({
    description: '删除成功',
    schema: {
      type: 'object',
      properties: { deleted: { type: 'boolean', example: true } },
    },
  })
  remove(@Param('id') id: string) {
    return this.issueTypeService.remove(id);
  }
}
