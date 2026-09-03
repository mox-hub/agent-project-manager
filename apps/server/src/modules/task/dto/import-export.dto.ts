import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportTaskDto {
  @ApiProperty({ description: '任务标题' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: '任务描述' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsString()
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

export class ImportTasksDto {
  @ApiProperty({ description: '导入任务列表', type: [ImportTaskDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportTaskDto)
  tasks: ImportTaskDto[];
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}
