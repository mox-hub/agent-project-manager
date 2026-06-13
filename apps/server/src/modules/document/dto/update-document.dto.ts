import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDocumentDto {
  @ApiPropertyOptional({ description: 'Document title' })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Document content in Markdown' })
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
    required: false,
  })
  @IsEnum(['requirement', 'design', 'api', 'testing', 'guide', 'custom'])
  @IsOptional()
  category?: string;

  @ApiProperty({
    description: 'Document status',
    enum: ['draft', 'reviewing', 'published', 'rejected'],
    required: false,
  })
  @IsEnum(['draft', 'reviewing', 'published', 'rejected'])
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Folder ID for organization' })
  @IsString()
  @IsOptional()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Tags for the document', type: [String] })
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];
}
