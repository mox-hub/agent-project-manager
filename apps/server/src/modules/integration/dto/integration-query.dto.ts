import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IntegrationQueryDto {
  @ApiProperty({
    description: 'Filter by provider',
    example: 'github',
    required: false,
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiProperty({
    description: 'Filter by project ID',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;
}
