/**
 * 契约类型基座：openapi 生成类型的消费入口。
 *
 * openapi.json 的 components.schemas 目前只覆盖请求侧 DTO（响应体在服务端
 * 声明 @ApiOkResponse 之前是 content?: never）——因此本基座现阶段用于：
 *   1. 请求体 / 查询参数 / 路径参数直接引用契约类型，删除手抄 payload；
 *   2. operations 键名即端点清单，路径字面量可对照校验。
 * 服务端响应类型战役（逐端点补 @ApiOkResponse）落地后，响应侧同样从这里取。
 */
import type { components, operations } from './generated/api-types.gen';

export type ApiSchemas = components['schemas'];
export type ApiOperations = operations;

/** 请求体：RequestBodyOf<'ProjectController_create'> */
export type RequestBodyOf<Op extends keyof ApiOperations> = NonNullable<
  ApiOperations[Op]['requestBody']
> extends { content: { 'application/json': infer Body } }
  ? Body
  : unknown;

/** 查询参数：QueryOf<'ProjectController_findAll'> */
export type QueryOf<Op extends keyof ApiOperations> = NonNullable<
  ApiOperations[Op]['parameters']
> extends { query?: infer Q }
  ? Q
  : unknown;

/** 路径参数：PathParamsOf<'ProjectController_findOne'> */
export type PathParamsOf<Op extends keyof ApiOperations> = NonNullable<
  ApiOperations[Op]['parameters']
> extends { path?: infer P }
  ? P
  : unknown;
