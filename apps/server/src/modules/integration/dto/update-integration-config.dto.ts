import { PartialType } from '@nestjs/mapped-types';
import { CreateIntegrationConfigDto } from './create-integration-config.dto';
import { IsOptional, IsBoolean, IsObject, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateIntegrationConfigDto extends PartialType(CreateIntegrationConfigDto) {
  @ApiProperty({
    description: 'Integration name',
    example: 'GitHub Production',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Additional metadata',
    example: { key: 'value' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the integration is enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Integration configuration',
    example: { token: 'ghp_xxx' },
    required: false,
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({
    description: 'Integration status',
    enum: ['connected', 'disconnected', 'error'],
    example: 'connected',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string; // 'connected' | 'disconnected' | 'error'

  @ApiProperty({
    description: 'Error message if status is error',
    example: 'Invalid API token',
    required: false,
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
