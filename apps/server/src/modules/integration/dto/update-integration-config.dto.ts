import { PartialType } from '@nestjs/mapped-types';
import { CreateIntegrationConfigDto } from './create-integration-config.dto';
import { IsOptional, IsBoolean, IsObject, IsString } from 'class-validator';

export class UpdateIntegrationConfigDto extends PartialType(CreateIntegrationConfigDto) {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @IsOptional()
  @IsString()
  status?: string; // 'connected' | 'disconnected' | 'error'

  @IsOptional()
  @IsString()
  errorMessage?: string;
}
