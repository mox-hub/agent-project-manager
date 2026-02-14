import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'Updated Project Name',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Project description',
    example: 'Updated description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Project type',
    enum: ['personal', 'team', 'experiment', 'enterprise'],
    example: 'team',
    required: false,
  })
  @IsEnum(['personal', 'team', 'experiment', 'enterprise'])
  @IsOptional()
  type?: string;

  @ApiProperty({
    description: 'Project visibility',
    enum: ['private', 'internal', 'public'],
    example: 'private',
    required: false,
  })
  @IsEnum(['private', 'internal', 'public'])
  @IsOptional()
  visibility?: string;

  @ApiProperty({
    description: 'Project status',
    enum: ['active', 'archived'],
    example: 'active',
    required: false,
  })
  @IsEnum(['active', 'archived'])
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: 'Project configuration',
    example: { key: 'value' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}
