import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum IntegrationScope {
  GLOBAL = 'global',
  PROJECT = 'project',
}

export const INTEGRATION_PROVIDERS = [
  'github',
  'gitlab',
  'jira',
  'linear',
  'slack',
  'discord',
  'notion',
  'figma',
  'sentry',
] as const;

/**
 * Linear configuration
 * (文档参考 — 实际字段校验由 Linear 服务在解密后执行,
 * 这里仅使用 IsObject() 避免 whitelist: true + forbidNonWhitelisted 把未知字段拒掉)
 */
export class LinearConfigPayload {
  @ApiProperty({ description: 'Personal API Key (Linear Settings -> API)' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'API key type', default: 'personal', required: false })
  @IsOptional()
  @IsIn(['personal'])
  apiKeyType?: 'personal';

  @ApiProperty({ description: 'Default workspace/team binding', required: false })
  @IsOptional()
  @IsString()
  defaultTeamId?: string;
}

/**
 * Generic config payload for non-Linear integrations.
 */
export class GenericConfigPayload {
  @ApiProperty({ description: 'Provider-specific tokens (will be encrypted)' })
  @IsObject()
  config: Record<string, any>;
}

export class CreateIntegrationConfigDto {
  @ApiProperty({
    description: 'Integration provider',
    enum: INTEGRATION_PROVIDERS as unknown as string[],
    example: 'linear',
  })
  @IsIn(INTEGRATION_PROVIDERS as unknown as string[])
  provider: (typeof INTEGRATION_PROVIDERS)[number];

  @ApiProperty({
    description: 'Integration scope',
    enum: IntegrationScope,
    example: IntegrationScope.PROJECT,
  })
  @IsEnum(IntegrationScope)
  scope: IntegrationScope;

  @ApiProperty({
    description: 'Project ID (required if scope is PROJECT)',
    example: 'project-123',
    required: false,
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({
    description: 'Integration name',
    example: 'Linear Workspace',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Whether the integration is enabled',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    description: 'Provider-specific configuration (validated server-side per provider)',
    oneOf: [
      { $ref: '#/components/schemas/LinearConfigPayload' },
      { type: 'object', additionalProperties: true },
    ],
  })
  @IsObject()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: any;

  @ApiProperty({
    description: 'Additional metadata',
    required: false,
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
