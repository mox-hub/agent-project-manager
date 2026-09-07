import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIssueTemplateItemDto {
  @ApiProperty({ description: '条目标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '条目描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '初始状态' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: '预估工时' })
  @IsNumber()
  @IsOptional()
  estimate?: number;

  @ApiPropertyOptional({ description: '父条目 ID（模板内层级）' })
  @IsString()
  @IsOptional()
  parentItemId?: string;
}

export class CreateIssueTemplateDto {
  @ApiProperty({ description: '模板名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '所属项目 ID（不填为全局模板）' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: '模板分类' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: '任务条目列表',
    type: [CreateIssueTemplateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIssueTemplateItemDto)
  items?: CreateIssueTemplateItemDto[];
}

export class UpdateIssueTemplateDto {
  @ApiPropertyOptional({ description: '模板名称' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: '模板描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '模板分类' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: '任务条目列表',
    type: [CreateIssueTemplateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIssueTemplateItemDto)
  @IsOptional()
  items?: CreateIssueTemplateItemDto[];
}

export class UseIssueTemplateDto {
  @ApiProperty({ description: '应用模板的目标项目 ID' })
  @IsString()
  projectId: string;
}

// ========== 响应 DTO（口径：JSON 序列化后的 Prisma 裸数据） ==========

export class IssueTemplateItemResponseDto {
  @ApiProperty({ description: '条目 ID' })
  id: string;

  @ApiProperty({ description: '所属模板 ID' })
  templateId: string;

  @ApiProperty({ description: '条目标题' })
  title: string;

  @ApiProperty({ description: '条目描述', nullable: true, type: String })
  description: string | null;

  @ApiProperty({ description: '初始状态', nullable: true, type: String })
  status: string | null;

  @ApiProperty({ description: '优先级', nullable: true, type: String })
  priority: string | null;

  @ApiProperty({ description: '预估工时', nullable: true, type: Number })
  estimate: number | null;

  @ApiProperty({
    description: '父条目 ID（模板内层级）',
    nullable: true,
    type: String,
  })
  parentItemId: string | null;
}

export class IssueTemplateResponseDto {
  @ApiProperty({ description: '模板 ID' })
  id: string;

  @ApiProperty({
    description: '所属项目 ID（全局模板为 null）',
    nullable: true,
    type: String,
  })
  projectId: string | null;

  @ApiProperty({ description: '模板名称' })
  name: string;

  @ApiProperty({ description: '模板描述', nullable: true, type: String })
  description: string | null;

  @ApiProperty({ description: '模板分类', nullable: true, type: String })
  category: string | null;

  @ApiProperty({
    description: '任务条目列表',
    type: [IssueTemplateItemResponseDto],
  })
  items: IssueTemplateItemResponseDto[];

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;
}

/** POST /issue-templates/:id/use —— 按模板批量建任务的结果 */
export class UseIssueTemplateResponseDto {
  @ApiProperty({ description: '模板名称' })
  template: string;

  @ApiProperty({ description: '创建的任务数' })
  tasksCreated: number;

  @ApiProperty({
    description: '新创建的任务实体列表（Prisma Issue 全量字段）',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  tasks: Record<string, unknown>[];
}
