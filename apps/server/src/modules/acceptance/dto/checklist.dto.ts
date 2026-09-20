import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsIn,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/** 清单检查项（审计按 severity 分级：critical/high=阻断，medium/low=建议） */
export class ChecklistItemDto {
  @ApiProperty({ description: '分类' })
  @IsString()
  category: string;

  @ApiProperty({ description: '检查项内容' })
  @IsString()
  content: string;

  @ApiProperty({
    description: '严重级别',
    enum: ['critical', 'high', 'medium', 'low'],
  })
  @IsIn(['critical', 'high', 'medium', 'low'])
  severity: string;

  @ApiPropertyOptional({ description: '是否可自动修复' })
  @IsOptional()
  @IsBoolean()
  autoFixable?: boolean;
}

export class CreateChecklistDto {
  @ApiProperty({ description: '清单名称' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: '清单描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '项目类型' })
  @IsString()
  projectType: string;

  @ApiProperty({ description: '技术栈' })
  @IsString()
  techStack: string;

  @ApiProperty({ description: '清单内容', type: [ChecklistItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist: ChecklistItemDto[];
}

export class UpdateChecklistDto {
  @ApiPropertyOptional({ description: '清单名称' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: '清单描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '清单内容', type: [ChecklistItemDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  checklist?: ChecklistItemDto[];
}
