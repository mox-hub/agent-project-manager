import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 错误负载
 *
 * 失败时由 GlobalExceptionFilter 或业务异常填充。
 * `code` 用于程序化处理（i18n、客户端分支判断），
 * `message` 给人类阅读，`details` 携带上下文（如字段级校验错误）。
 */
export class ErrorPayloadDto {
  @ApiProperty({
    description: '业务错误码，例如 PROJECT_NOT_FOUND / VALIDATION_ERROR',
    example: 'PROJECT_NOT_FOUND',
  })
  code!: string;

  @ApiProperty({
    description: '人类可读的错误描述',
    example: '项目不存在或已被删除',
  })
  message!: string;

  @ApiPropertyOptional({
    description: '附加上下文（如字段级校验错误、Prisma 元数据）',
  })
  details?: unknown;
}

/**
 * 标准 API 响应体
 *
 * 所有 controller 通过 TransformInterceptor 统一包装为该结构。
 * data 字段在无数据时为 null（不是 undefined），前端可直接 .data 访问。
 */
export class ApiResponseDto<T = unknown> {
  @ApiProperty({
    description: 'HTTP 状态码（如 200/201/400/500）',
    example: 200,
  })
  status!: number;

  @ApiProperty({
    description: '便捷布尔判断，与 status 一致',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: '人类可读的操作摘要或错误描述',
    example: '操作成功',
  })
  description!: string;

  @ApiProperty({
    description: '业务数据；无数据时为 null',
    nullable: true,
  })
  data!: T | null;

  @ApiPropertyOptional({
    description: '失败时携带的错误负载',
    type: ErrorPayloadDto,
  })
  error?: ErrorPayloadDto;

  @ApiProperty({
    description: '服务器响应时间（ISO 8601）',
    example: '2026-07-23T11:11:11.000Z',
  })
  timestamp!: string;

  @ApiPropertyOptional({
    description: '请求追踪 ID，便于日志/排障',
    example: 'req-5e9b...',
  })
  requestId?: string;
}

/**
 * 分页数据载荷
 *
 * 各 controller 若返回列表 + total，应规范为该结构后交由 TransformInterceptor 包装。
 */
export class PaginatedDataDto<T = unknown> {
  @ApiProperty({ description: '当前页数据', isArray: true })
  items!: T[];

  @ApiProperty({ description: '总记录数', example: 123 })
  total!: number;

  @ApiProperty({ description: '当前页码（从 1 起）', example: 1 })
  page!: number;

  @ApiProperty({ description: '每页大小', example: 20 })
  pageSize!: number;
}

export class PaginatedResponseDto<T = unknown> extends ApiResponseDto<
  PaginatedDataDto<T>
> {
  @ApiProperty({ type: () => PaginatedDataDto })
  declare data: PaginatedDataDto<T> | null;
}
