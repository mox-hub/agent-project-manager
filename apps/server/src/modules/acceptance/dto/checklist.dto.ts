import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

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

  @ApiProperty({ description: '清单内容' })
  @IsString()
  checklist: any;
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

  @ApiPropertyOptional({ description: '清单内容' })
  @IsOptional()
  checklist?: any;
}

export class ChecklistItemDto {
  @ApiProperty({ description: '分类' })
  @IsString()
  category: string;

  @ApiProperty({ description: '检查项内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '严重级别' })
  @IsString()
  severity: string;

  @ApiPropertyOptional({ description: '是否可自动修复' })
  @IsOptional()
  autoFixable?: boolean;
}
