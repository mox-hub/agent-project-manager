import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  ApiResponseDto,
  PaginatedResponseDto,
  ErrorPayloadDto,
} from '../dto/api-response.dto';

interface ApiStandardResponseOptions {
  status?: number;
  description?: string;
  isArray?: boolean;
  isPaginated?: boolean;
}

const standardErrorDecorators = (description?: string) => [
  ApiBadRequestResponse({
    description: description ?? '请求参数错误',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            error: { $ref: getSchemaPath(ErrorPayloadDto) },
          },
        },
      ],
    },
  }),
  ApiUnauthorizedResponse({
    description: '未登录或登录已过期',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            error: { $ref: getSchemaPath(ErrorPayloadDto) },
          },
        },
      ],
    },
  }),
  ApiForbiddenResponse({
    description: '无权限访问',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            error: { $ref: getSchemaPath(ErrorPayloadDto) },
          },
        },
      ],
    },
  }),
  ApiNotFoundResponse({
    description: '资源不存在',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            error: { $ref: getSchemaPath(ErrorPayloadDto) },
          },
        },
      ],
    },
  }),
  ApiInternalServerErrorResponse({
    description: '服务器内部错误',
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponseDto) },
        {
          properties: {
            error: { $ref: getSchemaPath(ErrorPayloadDto) },
          },
        },
      ],
    },
  }),
];

/**
 * 标准成功响应装饰器
 *
 * 用法：
 *   @ApiStandardResponse(SomeDto)
 *   @ApiStandardResponse(SomeDto, { description: '返回 X' })
 *   @ApiStandardResponse(SomeDto, { status: 201, description: '创建成功' })
 *
 * 自动注入：
 *   - 200/201 的 ApiOkResponse / ApiCreatedResponse（包装 ApiResponseDto）
 *   - 400/401/403/404/500 的错误响应（统一结构）
 */
export function ApiStandardResponse<T extends Type>(
  dataDto: T,
  options: ApiStandardResponseOptions = {},
) {
  const {
    status = 200,
    description,
    isArray = false,
    isPaginated = false,
  } = options;

  const baseSchemaRef = isPaginated
    ? { $ref: getSchemaPath(PaginatedResponseDto) }
    : { $ref: getSchemaPath(ApiResponseDto) };

  const dataPropSchema = isArray
    ? { type: 'array' as const, items: { $ref: getSchemaPath(dataDto) } }
    : { $ref: getSchemaPath(dataDto) };

  const successSchema = {
    allOf: [
      baseSchemaRef,
      {
        properties: {
          data: dataPropSchema,
        },
      },
    ],
  };

  const successDecorator =
    status === 201
      ? ApiCreatedResponse({
          description: description ?? '创建成功',
          schema: successSchema,
        })
      : ApiOkResponse({
          description: description ?? '操作成功',
          schema: successSchema,
        });

  return applyDecorators(
    ApiExtraModels(ApiResponseDto, ErrorPayloadDto, dataDto),
    successDecorator,
    ...standardErrorDecorators(),
  );
}

/**
 * 分页响应装饰器
 *
 * 注册 PaginatedResponseDto + PaginatedDataDto，
 * 并将 data 类型设置为 items 数组。
 */
export function ApiPaginatedResponse<T extends Type>(itemDto: T) {
  const successSchema = {
    allOf: [
      { $ref: getSchemaPath(PaginatedResponseDto) },
      {
        properties: {
          data: {
            type: 'object' as const,
            properties: {
              items: {
                type: 'array' as const,
                items: { $ref: getSchemaPath(itemDto) },
              },
              total: { type: 'number' as const, example: 0 },
              page: { type: 'number' as const, example: 1 },
              pageSize: { type: 'number' as const, example: 20 },
            },
          },
        },
      },
    ],
  };

  return applyDecorators(
    ApiExtraModels(
      ApiResponseDto,
      PaginatedResponseDto,
      ErrorPayloadDto,
      itemDto,
    ),
    ApiOkResponse({
      description: '分页数据',
      schema: successSchema,
    }),
    ...standardErrorDecorators(),
  );
}
