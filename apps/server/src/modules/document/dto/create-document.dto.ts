import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Document title', example: 'API Design Document' })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiProperty({ description: 'Document content in Markdown', required: false })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Document summary' })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({
    description: 'Document category',
    enum: ['requirement', 'design', 'api', 'testing', 'guide', 'custom'],
    default: 'custom',
  })
  @IsEnum(['requirement', 'design', 'api', 'testing', 'guide', 'custom'])
  @IsOptional()
  category?: string = 'custom';

  @ApiPropertyOptional({ description: 'Folder ID for organization' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Associated project ID' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Tags for the document', type: [String] })
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
