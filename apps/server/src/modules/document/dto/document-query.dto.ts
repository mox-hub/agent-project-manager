import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const CATEGORY_ENUM = [
  'requirement',
  'design',
  'api',
  'testing',
  'guide',
  'custom',
] as const;
const STATUS_ENUM = ['draft', 'reviewing', 'published', 'rejected'] as const;

export class DocumentQueryDto {
  @ApiPropertyOptional({ description: 'Search query for title/summary' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    enum: [...CATEGORY_ENUM, 'all'],
  })
  @IsEnum([...CATEGORY_ENUM, 'all'])
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: [...STATUS_ENUM, 'all'],
  })
  @IsEnum([...STATUS_ENUM, 'all'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by folder ID' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  pageSize?: number = 20;
}
