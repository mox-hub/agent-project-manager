import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My Project',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Project description',
    example: 'A description of the project',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Project type',
    enum: ['personal', 'team', 'experiment', 'enterprise'],
    example: 'team',
  })
  @IsEnum(['personal', 'team', 'experiment', 'enterprise'])
  type: string;

  @ApiProperty({
    description: 'Project visibility',
    enum: ['private', 'internal', 'public'],
    example: 'private',
  })
  @IsEnum(['private', 'internal', 'public'])
  visibility: string;

  @ApiProperty({
    description: 'Project configuration',
    example: { key: 'value' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  config?: Record<string, any>;

  @ApiProperty({
    description: 'Project template ID',
    example: 'template-123',
    required: false,
  })
  @IsString()
  @IsOptional()
  templateId?: string;
}
