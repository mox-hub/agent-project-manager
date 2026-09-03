// Document Task Link DTOs
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskLinkDto {
  @ApiPropertyOptional({ description: '文档 ID' })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ description: '章节 ID' })
  @IsOptional()
  @IsString()
  sectionId?: string;

  @ApiProperty({ description: '关联任务 ID' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: '所属项目 ID' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: '链接类型',
    enum: ['references', 'blocks', 'relates', 'implements'],
  })
  @IsOptional()
  @IsEnum(['references', 'blocks', 'relates', 'implements'])
  linkType?: 'references' | 'blocks' | 'relates' | 'implements';

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateLinkTypeDto {
  @ApiProperty({
    description: '链接类型',
    enum: ['references', 'blocks', 'relates', 'implements'],
  })
  @IsEnum(['references', 'blocks', 'relates', 'implements'])
  linkType: 'references' | 'blocks' | 'relates' | 'implements';
}

export class BatchCreateLinksDto {
  @ApiProperty({ description: '链接列表', type: [CreateTaskLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTaskLinkDto)
  links: CreateTaskLinkDto[];
}
