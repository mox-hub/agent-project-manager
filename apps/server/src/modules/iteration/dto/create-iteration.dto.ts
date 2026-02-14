import { IsString, IsOptional, IsDateString, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateIterationDto {
  @ApiProperty({
    description: 'Project ID',
    example: 'project-123',
  })
  @IsString()
  projectId: string;

  @ApiProperty({
    description: 'Iteration name',
    example: 'Sprint 1',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Iteration goal',
    example: 'Complete user authentication feature',
    required: false,
  })
  @IsString()
  @IsOptional()
  goal?: string;

  @ApiProperty({
    description: 'Start date (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'End date (ISO 8601)',
    example: '2024-01-14T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiProperty({
    description: 'Iteration capacity (hours)',
    example: 160,
    required: false,
  })
  @IsInt()
  @IsOptional()
  capacity?: number;
}
