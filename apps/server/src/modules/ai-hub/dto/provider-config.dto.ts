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
  /** OpenCode Zen 订阅网关（openai 兼容，https://opencode.ai/zen/v1） */
  OPENCODE = 'opencode',
  /** OpenCode Go 订阅网关（openai 兼容，https://opencode.ai/zen/go/v1） */
  OPENCODE_GO = 'opencode-go',
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
    description:
      'Provider 类型（同类型可建多个槽位，如双网关；类型+显示名组合唯一）',
    enum: AIProviderType,
    example: 'openai',
  })
  @IsEnum(AIProviderType)
  provider: AIProviderType;

  @ApiProperty({
    description: '槽位显示名称（同类型内唯一）',
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
    type: 'object',
    additionalProperties: true,
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
    description: '显示名称（同类型内唯一，与同类型其他槽位重名时返回 400）',
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
    type: 'object',
    additionalProperties: true,
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
    description: '自定义端点',
  })
  @IsString()
  @IsOptional()
  organizationId?: string;

  @ApiPropertyOptional({
    description: '已保存配置记录 ID——校验通过时同步该记录在线状态为 connected',
  })
  @IsString()
  @IsOptional()
  providerConfigId?: string;
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

  @ApiPropertyOptional({
    description: '附加配置',
    type: 'object',
    additionalProperties: true,
  })
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: '该厂家已启用的模型清单（AIModelConfig，模型查询结果）',
    type: [String],
    example: ['deepseek-chat', 'deepseek-reasoner'],
  })
  availableModels?: string[];
}

/**
 * 设置内置模型 DTO（工作区默认 AI 模型）
 */
export class SetDefaultModelDto {
  @ApiProperty({
    description: 'Provider 类型（须为已配置且启用的厂家）',
    enum: AIProviderType,
    example: 'deepseek',
  })
  @IsEnum(AIProviderType)
  provider: AIProviderType;

  @ApiProperty({
    description: '模型名（不做白名单校验，允许自填新模型）',
    example: 'deepseek-chat',
  })
  @IsString()
  @MinLength(1)
  model: string;
}

/**
 * 内置模型响应 DTO
 */
export class DefaultModelResponseDto {
  @ApiPropertyOptional({
    description: 'Provider 类型（未设置时为 null）',
    enum: AIProviderType,
    nullable: true,
    example: 'deepseek',
  })
  provider?: AIProviderType | null;

  @ApiPropertyOptional({
    description: '模型名（未设置时为 null）',
    nullable: true,
    example: 'deepseek-chat',
  })
  model?: string | null;
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

/**
 * 余额类型枚举：充值型（余额进度）/ 套餐型（限额窗口）/ 未知
 */
export enum AIBalanceType {
  PREPAID = 'prepaid',
  SUBSCRIPTION = 'subscription',
  UNKNOWN = 'unknown',
}

/**
 * 套餐型限额窗口（如编程套餐的 5 小时/周/月限额）
 */
export class ProviderBalanceWindowDto {
  @ApiProperty({
    description: '周期（归一化：5h / day / week / month）',
    example: '5h',
  })
  period: string;

  @ApiPropertyOptional({
    description: '已用量（token 数或金额，视厂家返回而定）',
    nullable: true,
    example: 1200000,
  })
  used?: number | null;

  @ApiPropertyOptional({
    description: '限额（token 数或金额）',
    nullable: true,
    example: 5000000,
  })
  limit?: number | null;

  @ApiPropertyOptional({
    description: '剩余额度',
    nullable: true,
  })
  remaining?: number | null;

  @ApiPropertyOptional({
    description:
      '已用百分比（0-100；厂家仅返回百分比时提供，此时 used/limit 为 null）',
    nullable: true,
    example: 20,
  })
  percent?: number | null;

  @ApiPropertyOptional({
    description: '窗口重置时间（厂家原样返回）',
    nullable: true,
  })
  resetsAt?: string | null;
}

/**
 * Provider 余额查询响应（归一化；按返回内容自适应充值型/套餐型）
 */
export class ProviderBalanceResponseDto {
  @ApiProperty({
    description:
      '余额类型：prepaid=充值型（单余额）/ subscription=套餐型（限额窗口）/ unknown',
    enum: AIBalanceType,
    example: 'prepaid',
  })
  type: AIBalanceType;

  @ApiPropertyOptional({
    description: '币种（充值型，如 CNY）',
    nullable: true,
    example: 'CNY',
  })
  currency?: string | null;

  @ApiPropertyOptional({
    description: '剩余余额（充值型）',
    nullable: true,
    example: 110.0,
  })
  balance?: number | null;

  @ApiPropertyOptional({
    description: '赠送余额累计（充值型，可作进度条分母）',
    nullable: true,
    example: 10.0,
  })
  grantedBalance?: number | null;

  @ApiPropertyOptional({
    description: '充值余额累计（充值型，可作进度条分母）',
    nullable: true,
    example: 100.55,
  })
  toppedUpBalance?: number | null;

  @ApiPropertyOptional({
    description: '账户是否可用（DeepSeek is_available）',
    nullable: true,
  })
  isAvailable?: boolean | null;

  @ApiProperty({
    description: '限额窗口（套餐型：5h/周/月等；充值型为空数组）',
    type: ProviderBalanceWindowDto,
    isArray: true,
  })
  windows: ProviderBalanceWindowDto[];
}
