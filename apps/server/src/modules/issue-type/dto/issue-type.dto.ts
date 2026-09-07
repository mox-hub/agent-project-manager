import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  Matches,
  Min,
  Max,
  Length,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FieldSchemaDefDto {
  @ApiProperty({ description: '字段 key（小写 slug）', example: 'severity' })
  @IsString()
  key: string;

  @ApiProperty({ description: '显示名', example: '严重度' })
  @IsString()
  label: string;

  @ApiProperty({
    description: '字段类型',
    enum: ['text', 'textarea', 'select', 'multiselect', 'number', 'date'],
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: '是否必填（create 时强制）' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'select/multiselect 选项',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;
}

export class CreateIssueTypeDto {
  @ApiProperty({
    description: '类型键（小写 slug，创建后不可改）',
    example: 'page',
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]{1,31}$/, {
    message: 'key 必须是小写字母开头的 2-32 位 slug',
  })
  key: string;

  @ApiProperty({ description: '类型名称', example: '页面' })
  @IsString()
  @Length(1, 50)
  name: string;

  @ApiPropertyOptional({ description: 'lucide 图标名', example: 'FileCode' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({ description: '颜色（hex）', example: '#8B5CF6' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color 必须是 6 位 hex' })
  color?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  order?: number;

  @ApiPropertyOptional({
    description: '字段定义（适配引擎二期）：数组，key 唯一',
    type: [FieldSchemaDefDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  fieldSchema?: FieldSchemaDefDto[];
}

export class UpdateIssueTypeDto {
  @ApiPropertyOptional({ description: '类型名称' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  name?: string;

  @ApiPropertyOptional({ description: 'lucide 图标名' })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({ description: '颜色（hex）' })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color 必须是 6 位 hex' })
  color?: string;

  @ApiPropertyOptional({ description: '排序权重' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  order?: number;

  @ApiPropertyOptional({
    description: '字段定义（整体替换；传 null 清空）',
    type: [FieldSchemaDefDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  fieldSchema?: FieldSchemaDefDto[];
}

export class IssueTypeUsageDto {
  @ApiPropertyOptional({ description: '是否返回任务引用计数' })
  @IsOptional()
  @IsBoolean()
  withUsage?: boolean;
}

// ========== 响应 DTO（口径：JSON 序列化后的 Prisma IssueType 裸数据） ==========

export class IssueTypeUsageCountDto {
  @ApiProperty({ description: '使用该类型的任务数' })
  issues: number;
}

export class IssueTypeResponseDto {
  @ApiProperty({ description: '类型 ID' })
  id: string;

  @ApiProperty({ description: '类型键（小写 slug）', example: 'bug' })
  key: string;

  @ApiProperty({ description: '类型名称', example: '缺陷' })
  name: string;

  @ApiProperty({ description: 'lucide 图标名', example: 'Circle' })
  icon: string;

  @ApiProperty({ description: '颜色（hex）', example: '#5E6AD2' })
  color: string;

  @ApiProperty({ description: '排序权重' })
  order: number;

  @ApiProperty({ description: '是否内置类型（task/bug）' })
  isSystem: boolean;

  @ApiProperty({
    description: '字段定义（未配置时为 null）',
    type: [FieldSchemaDefDto],
    nullable: true,
  })
  fieldSchema: FieldSchemaDefDto[] | null;

  @ApiProperty({ description: '创建时间（ISO 8601）' })
  createdAt: string;

  @ApiProperty({ description: '更新时间（ISO 8601）' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '任务引用计数（仅 withUsage=true 时返回）',
    type: IssueTypeUsageCountDto,
  })
  _count?: IssueTypeUsageCountDto;
}
