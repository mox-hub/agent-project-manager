import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsArray,
} from 'class-validator';

export const CLI_PROVIDER_IDS = ['claude-code', 'codex', 'zcode'] as const;
export type CliProviderId = (typeof CLI_PROVIDER_IDS)[number];

export class ConfigureCliProviderDto {
  @ApiProperty({
    description: 'Provider ID (must match path param :id)',
    enum: CLI_PROVIDER_IDS,
  })
  @IsString()
  @IsIn(CLI_PROVIDER_IDS as unknown as string[])
  providerId!: CliProviderId;

  @ApiPropertyOptional({ description: 'Display name override' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Custom command path; if empty, fall back to PATH lookup',
  })
  @IsOptional()
  @IsString()
  commandPath?: string;

  @ApiPropertyOptional({ description: 'Default model name' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Environment variables to inject into subprocess',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  @IsOptional()
  @IsObject()
  env?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Allowed tool patterns',
    type: 'string',
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTools?: string[];

  @ApiPropertyOptional({ description: 'Enable or disable this provider' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
