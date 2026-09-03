import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskTemplateItemDto {
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

export class CreateTaskTemplateDto {
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
    type: [CreateTaskTemplateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskTemplateItemDto)
  items?: CreateTaskTemplateItemDto[];
}

export class UpdateTaskTemplateDto {
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
    type: [CreateTaskTemplateItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskTemplateItemDto)
  @IsOptional()
  items?: CreateTaskTemplateItemDto[];
}

export class UseTaskTemplateDto {
  @ApiProperty({ description: '应用模板的目标项目 ID' })
  @IsString()
  projectId: string;
}
