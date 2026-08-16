import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  MinLength,
} from 'class-validator';

/**
 * AI Provider 类型枚举
 */
export enum AIProviderType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GEMINI = 'gemini',
  DEEPSEEK = 'deepseek',
  GLM = 'glm',
}

/**
 * AI Provider 状态枚举
 */
export enum AIProviderStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * AI SDK 类型枚举（用于工厂）
 */
export enum AISdkType {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
}

/**
 * 创建 Provider 配置 DTO
 */
export class CreateProviderConfigDto {
  @ApiProperty({
    description: 'Provider 类型',
    enum: AIProviderType,
    example: 'openai',
  })
  @IsEnum(AIProviderType)
  provider: AIProviderType;

  @ApiProperty({
    description: '显示名称',
    example: 'OpenAI',
  })
  @IsString()
  @MinLength(1)
  displayName: string;

  @ApiProperty({
    description: 'API Key（将被加密存储）',
    example: 'sk-...',
  })
  @IsString()
  @MinLength(1)
  apiKey: string;

  @ApiPropertyOptional({
    description: '自定义端点（DeepSeek/GLM/Azure 必填）',
    example: 'https://api.deepseek.com/v1',
  })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'OpenAI Organization ID',
    example: 'org-xxx',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: '非敏感附加配置',
    example: { timeout: 30000 },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 更新 Provider 配置 DTO
 */
export class UpdateProviderConfigDto {
  @ApiPropertyOptional({
    description: '显示名称',
    example: 'OpenAI Production',
  })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({
    description: 'API Key（可选，不更新则留空）',
  })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({
    description: '自定义端点',
  })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'OpenAI Organization ID',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @ApiPropertyOptional({
    description: '非敏感附加配置',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

/**
 * 校验 Provider DTO（不落库）
 */
export class ValidateProviderDto {
  @ApiProperty({
    description: 'Provider 类型',
    enum: AIProviderType,
    example: 'openai',
  })
  @IsEnum(AIProviderType)
  provider: AIProviderType;

  @ApiProperty({
    description: 'API Key',
    example: 'sk-...',
  })
  @IsString()
  @MinLength(1)
  apiKey: string;

  @ApiPropertyOptional({
    description: '自定义端点',
  })
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'OpenAI Organization ID',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;
}

/**
 * Provider 配置响应 DTO（不含敏感信息）
 */
export class ProviderConfigResponseDto {
  @ApiProperty({ description: 'Provider ID' })
  id: string;

  @ApiProperty({ description: 'Provider 类型', enum: AIProviderType })
  provider: AIProviderType;

  @ApiProperty({ description: '显示名称' })
  displayName: string;

  @ApiPropertyOptional({ description: 'SDK 类型', enum: AISdkType })
  sdkType?: AISdkType;

  @ApiPropertyOptional({ description: '自定义端点' })
  baseUrl?: string;

  @ApiPropertyOptional({ description: 'Organization ID' })
  organizationId?: string;

  @ApiProperty({ description: '是否有 API Key' })
  hasApiKey: boolean;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '连接状态', enum: AIProviderStatus })
  status: AIProviderStatus;

  @ApiPropertyOptional({ description: '最后校验时间' })
  lastValidatedAt?: Date;

  @ApiPropertyOptional({ description: '错误信息' })
  errorMessage?: string;

  @ApiPropertyOptional({ description: '附加配置' })
  metadata?: Record<string, any>;
}

/**
 * 校验结果响应 DTO
 */
export class ValidateProviderResponseDto {
  @ApiProperty({ description: '是否有效' })
  valid: boolean;

  @ApiPropertyOptional({
    description: '可用模型列表',
    type: [String],
    example: ['gpt-4o', 'gpt-4o-mini'],
  })
  models?: string[];

  @ApiPropertyOptional({
    description: '错误信息',
    example: 'Invalid API key',
  })
  error?: string;
}
