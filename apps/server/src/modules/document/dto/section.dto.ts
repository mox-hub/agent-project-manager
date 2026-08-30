// Document Section DTOs
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSectionDto {
  @ApiProperty({ description: '所属文档 ID' })
  @IsString()
  documentId: string;

  @ApiProperty({ description: '章节标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '标题级别（h1-h6）', minimum: 1, maximum: 6 })
  @IsNumber()
  @Min(1)
  @Max(6)
  level: number;

  @ApiProperty({ description: '章节锚点' })
  @IsString()
  anchor: string;

  @ApiPropertyOptional({ description: '章节内容（Markdown）' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '排序序号' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: '父章节 ID' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateSectionDto {
  @ApiPropertyOptional({ description: '章节标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: '标题级别（h1-h6）',
    minimum: 1,
    maximum: 6,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  level?: number;

  @ApiPropertyOptional({ description: '章节锚点' })
  @IsOptional()
  @IsString()
  anchor?: string;

  @ApiPropertyOptional({ description: '章节内容（Markdown）' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '排序序号' })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({ description: '父章节 ID' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class RefreshSectionsDto {
  @ApiProperty({ description: '用于重新解析章节的文档内容' })
  @IsString()
  content: string;
}
