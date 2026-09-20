import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsIn,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** 导入允许的类型枚举（与 CreateIssueDto.type 同口径） */
export const IMPORT_ISSUE_TYPES: readonly string[] = ['task', 'bug'];

/** 导入允许的优先级枚举（与 CreateIssueDto.priority 同口径） */
export const IMPORT_ISSUE_PRIORITIES: readonly string[] = [
  'low',
  'medium',
  'high',
  'critical',
];

/** 单行导入错误（P0-8b：逐行报告，随 400 details.errors 返回） */
export interface IssueImportRowError {
  /** 数据行号，从 1 起 */
  row: number;
  /** 出错字段（可选） */
  field?: string;
  message: string;
}

export class ImportIssueDto {
  @ApiPropertyOptional({ description: '所属项目 ID（列表内全部任务须同项目）' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiProperty({ description: '任务标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: '任务类型（task/bug）',
    enum: [...IMPORT_ISSUE_TYPES],
  })
  @IsString()
  @IsIn([...IMPORT_ISSUE_TYPES])
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ description: '任务描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: '状态（须为项目/全局 StatusDefinition 已定义的 key）',
  })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({
    description: '优先级',
    enum: [...IMPORT_ISSUE_PRIORITIES],
  })
  @IsString()
  @IsIn([...IMPORT_ISSUE_PRIORITIES])
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ description: '负责人用户 ID' })
  @IsString()
  @IsOptional()
  assigneeId?: string;

  @ApiPropertyOptional({ description: '报告人用户 ID' })
  @IsString()
  @IsOptional()
  reporterId?: string;

  @ApiPropertyOptional({ description: '所属迭代 ID' })
  @IsString()
  @IsOptional()
  iterationId?: string;

  @ApiPropertyOptional({ description: '开始日期（ISO）' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: '截止日期（ISO）' })
  @IsString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({ description: '预估工时' })
  @IsNumber()
  @IsOptional()
  estimate?: number;
}

export class ImportIssuesDto {
  @ApiProperty({ description: '导入任务列表', type: [ImportIssueDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportIssueDto)
  tasks: ImportIssueDto[];
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}
