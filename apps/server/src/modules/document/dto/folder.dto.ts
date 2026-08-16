import { IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiPropertyOptional({ description: 'Folder name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Parent folder ID for nested folders' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Associated project ID' })
  @IsString()
  @IsOptional()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  order?: number;
}

export class UpdateFolderDto {
  @ApiPropertyOptional({ description: 'Folder name' })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Parent folder ID for nested folders' })
  @IsString()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Sort order' })
  @IsOptional()
  order?: number;
}
