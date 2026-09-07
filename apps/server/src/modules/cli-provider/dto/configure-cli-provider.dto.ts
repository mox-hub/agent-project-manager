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

// ========== 响应 DTO（镜像 service 导出的 CliProviderStatus / CliProvidersResponse 接口） ==========

export class CliProviderStatusDto {
  @ApiProperty({ description: 'Provider ID', enum: CLI_PROVIDER_IDS })
  providerId: CliProviderId;

  @ApiProperty({ description: '二进制是否可用（且未被禁用）' })
  available: boolean;

  @ApiPropertyOptional({ description: '探测到的版本号' })
  version?: string;

  @ApiPropertyOptional({ description: '不可用时的错误信息' })
  error?: string;

  @ApiProperty({ description: '实际命令路径（未配置时回退为 providerId）' })
  commandPath: string;

  @ApiPropertyOptional({ description: 'DB 配置的自定义命令路径' })
  configuredPath?: string;

  @ApiPropertyOptional({ description: '默认模型' })
  model?: string;

  @ApiPropertyOptional({
    description: '注入子进程的环境变量',
    type: 'object',
    additionalProperties: { type: 'string' },
  })
  env?: Record<string, string>;

  @ApiPropertyOptional({
    description: '允许的工具模式列表',
    type: 'string',
    isArray: true,
  })
  allowedTools?: string[];

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiPropertyOptional({ description: '最近探测时间（ISO 8601）' })
  lastDetectedAt?: string;

  @ApiPropertyOptional({
    description: '扩展元数据（health 端点附 lastHealthCheck）',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, unknown>;
}

/** GET /cli-providers */
export class CliProvidersResponseDto {
  @ApiProperty({
    description: 'Provider 状态列表',
    type: [CliProviderStatusDto],
  })
  providers: CliProviderStatusDto[];

  @ApiProperty({
    description: '默认 Provider（claude-code/codex 均不可用时为 null）',
    nullable: true,
    enum: CLI_PROVIDER_IDS,
  })
  defaultProvider: CliProviderId | null;
}

/** POST /cli-providers/detect */
export class CliProviderDetectResponseDto {
  @ApiProperty({
    description: '重新探测后的 Provider 状态列表',
    type: [CliProviderStatusDto],
  })
  providers: CliProviderStatusDto[];
}
