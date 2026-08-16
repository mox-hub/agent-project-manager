import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCriteriaDto {
  @ApiProperty({ description: '标准类型' })
  @IsString()
  @IsIn(['functional', 'technical'])
  criteriaType: string;

  @ApiPropertyOptional({ description: '分类' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ description: '标准内容' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: '来源' })
  @IsOptional()
  @IsString()
  @IsIn(['manual', 'linear', 'document', 'template', 'ci', 'model_evaluation'])
  source?: string;

  @ApiPropertyOptional({ description: '权重' })
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: '严重级别' })
  @IsOptional()
  @IsString()
  @IsIn(['critical', 'high', 'medium', 'low'])
  severity?: string;

  @ApiPropertyOptional({ description: '排序' })
  @IsOptional()
  @IsNumber()
  order?: number;
}

export class CreateAcceptanceDto {
  @ApiProperty({ description: '关联的任务 ID' })
  @IsString()
  taskId: string;

  @ApiPropertyOptional({ description: '验收类型' })
  @IsOptional()
  @IsString()
  @IsIn(['functional', 'technical', 'mixed'])
  type?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional({ description: '验收标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '验收描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '验收标准列表' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCriteriaDto)
  criteria?: CreateCriteriaDto[];

  @ApiPropertyOptional({ description: '是否自动创建执行' })
  @IsOptional()
  @IsBoolean()
  autoCreateExecution?: boolean;
}

export class UpdateAcceptanceDto {
  @ApiPropertyOptional({ description: '验收状态' })
  @IsOptional()
  @IsString()
  @IsIn(['draft', 'pending', 'in_review', 'passed', 'failed', 'waived'])
  status?: string;

  @ApiPropertyOptional({ description: '优先级' })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'critical'])
  priority?: string;

  @ApiPropertyOptional({ description: '验收标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: '验收描述' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class AuditRequestDto {
  @ApiPropertyOptional({ description: '清单 ID（留空则自动选择）' })
  @IsOptional()
  @IsString()
  checklistId?: string;
}

export class ApplySuggestionsDto {
  @ApiProperty({ description: '要采纳的提议项 ID 列表' })
  @IsArray()
  @IsString({ each: true })
  itemIds: string[];
}
