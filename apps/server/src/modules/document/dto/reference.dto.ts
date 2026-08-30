// Document Reference DTOs
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReferenceDto {
  @ApiProperty({
    description: '引用来源类型',
    enum: ['ai_conversation', 'task', 'project'],
  })
  @IsEnum(['ai_conversation', 'task', 'project'])
  sourceType: 'ai_conversation' | 'task' | 'project';

  @ApiProperty({ description: '来源实体 ID' })
  @IsString()
  sourceId: string;

  @ApiProperty({ description: '所属文档 ID' })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({ description: '章节 ID' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiPropertyOptional({ description: '锚点' })
  @IsOptional()
  @IsString()
  anchor?: string;

  @ApiPropertyOptional({ description: '引用上下文摘录' })
  @IsOptional()
  @IsString()
  context?: string;
}

export class BatchCreateReferencesDto {
  @ApiProperty({ description: '引用列表', type: [CreateReferenceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReferenceDto)
  references: CreateReferenceDto[];
}
